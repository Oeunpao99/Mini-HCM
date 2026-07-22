import json
from datetime import date, datetime, timedelta
from typing import Any

from fastapi import HTTPException
from sqlalchemy.orm import Session

from app.api.deps import MANAGEMENT_HR_ROLE, can_manage_people, normalize_role, scoped_user_ids
from app.api.requests import _initial_stage_statuses, _sync_final_status
from app.core.config import settings
from app.models.ai_conversation import AiChatMessage, AiConversation, AiPendingAction, AiToolAudit
from app.models.attendance.models import Attendance
from app.models.hris import EmployeeDocument, EmployeeProfile, TrainingRecord
from app.models.leave.models import LeaveEntitlement
from app.models.ot.models import OtRequest
from app.models.request import Request
from app.models.user import User


LEAVE_TYPES = {
    "annual",
    "sick",
    "maternity",
    "paternity",
    "marriage",
    "compassionate",
    "unpaid",
    "special",
    "business",
}
DEFAULT_LEAVE_ENTITLEMENTS = {
    "annual": 18,
    "sick": 6,
    "maternity": 0,
    "paternity": 0,
    "marriage": 0,
    "compassionate": 0,
    "unpaid": 0,
    "special": 0,
    "business": 0,
}
MAX_AUDIT_VALUE_LENGTH = 10_000
PENDING_ACTION_TTL_MINUTES = 10


def _serialize_request(row: Request, include_reason: bool = True) -> dict[str, Any]:
    result = {
        "id": row.id,
        "type": row.type,
        "date": row.date.isoformat() if row.date else None,
        "leave_type": row.leave_type,
        "status": row.status,
        "created_at": row.created_at.isoformat() if row.created_at else None,
    }
    if include_reason:
        result["reason"] = row.reason
    return result


def _serialize_attendance(row: Attendance, employee_name: str | None = None) -> dict[str, Any]:
    result = {
        "date": row.date.isoformat() if row.date else None,
        "check_in": str(row.check_in_time) if row.check_in_time else None,
        "check_out": str(row.check_out_time) if row.check_out_time else None,
        "is_late": row.is_late,
        "worked_hours": float(row.worked_hours) if row.worked_hours is not None else None,
    }
    if employee_name:
        result["employee"] = employee_name
    return result


def _user_context(user: User) -> str:
    return (
        f"Current user: {user.name} (employee code: {user.emp_code}, role: {user.role}, "
        f"department: {user.department or 'not assigned'})."
    )


def _system_prompt(user: User) -> str:
    return f"""You are the HCM agent for an employee management system.
Today is {date.today().isoformat()}.
{_user_context(user)}

Use available tools for any request that needs HCM data or changes a record. Do not invent attendance, request, leave, or team information.

For management questions about a staff member's work profile, training, certifications, or certificate expiry, use get_staff_information. Ask for an employee code or a more specific name when it returns multiple matches.

Format staff information with bold section labels and compact single-level bullet lists. Do not put blank lines between individual bullets or state "Not specified" for missing values. If the tool returns a contact_profile, include it as a compact Contact Profile section; render profile_photo as a Markdown image when present.

For leave, permission, and overtime requests, call prepare_request as soon as the user has provided the request type and date. This creates a preview that the user must explicitly confirm in the UI before any record is created. Ask one concise question only when the type or date is missing. Treat "tomorrow" and other relative dates using today's date.

For a sick leave request, set leave_type to "sick". Use the user's stated reason when available; otherwise use a brief neutral reason.

You may only access the current user's data unless a team tool permits access. Never promise an approval, payroll change, profile update, or other action when no tool exists for it.

After a tool completes, explain the result briefly and accurately. If a tool reports an error or denied access, explain it without exposing internal details."""


def _json_for_audit(value: Any) -> str:
    payload = json.dumps(value, default=str, ensure_ascii=True)
    return payload[:MAX_AUDIT_VALUE_LENGTH]


def _sanitize_arguments(arguments: dict[str, Any]) -> dict[str, Any]:
    return {
        key: "[redacted]" if key in {"reason"} else value
        for key, value in arguments.items()
    }


def _conversation_for_user(
    db: Session,
    user: User,
    conversation_id: str | None,
    first_message: str,
) -> AiConversation:
    if conversation_id:
        conversation = (
            db.query(AiConversation)
            .filter(AiConversation.public_id == conversation_id, AiConversation.user_id == user.id)
            .first()
        )
        if not conversation:
            raise HTTPException(status_code=404, detail="AI conversation not found")
        return conversation

    conversation = AiConversation(user_id=user.id, title=first_message.strip()[:120] or "New conversation")
    db.add(conversation)
    db.flush()
    return conversation


def _append_message(db: Session, conversation: AiConversation, role: str, content: str) -> AiChatMessage:
    last_message = (
        db.query(AiChatMessage)
        .filter(AiChatMessage.conversation_id == conversation.id)
        .order_by(AiChatMessage.sequence.desc())
        .first()
    )
    message = AiChatMessage(
        conversation_id=conversation.id,
        sequence=(last_message.sequence if last_message else 0) + 1,
        role=role,
        content=content,
    )
    db.add(message)
    conversation.updated_at = datetime.utcnow()
    db.flush()
    return message


def _record_tool_audit(
    db: Session,
    conversation: AiConversation,
    message: AiChatMessage,
    user: User,
    tool_name: str,
    status: str,
    arguments: dict[str, Any],
    result: Any,
) -> None:
    db.add(
        AiToolAudit(
            conversation_id=conversation.id,
            message_id=message.id,
            actor_id=user.id,
            tool_name=tool_name,
            status=status,
            arguments_json=_json_for_audit(_sanitize_arguments(arguments)),
            result_json=_json_for_audit(result),
        )
    )


def _my_attendance(db: Session, user: User, limit: int) -> list[dict[str, Any]]:
    rows = (
        db.query(Attendance)
        .filter(Attendance.user_id == user.id)
        .order_by(Attendance.date.desc())
        .limit(limit)
        .all()
    )
    return [_serialize_attendance(row) for row in rows]


def _my_requests(db: Session, user: User, limit: int) -> list[dict[str, Any]]:
    rows = (
        db.query(Request)
        .filter(Request.user_id == user.id)
        .order_by(Request.created_at.desc())
        .limit(limit)
        .all()
    )
    return [_serialize_request(row) for row in rows]


def _my_leave_entitlements(db: Session, user: User) -> dict[str, int]:
    row = db.query(LeaveEntitlement).filter(LeaveEntitlement.user_id == user.id).first()
    if not row:
        return DEFAULT_LEAVE_ENTITLEMENTS.copy()
    return {
        "annual": row.annual,
        "sick": row.sick,
        "maternity": row.maternity,
        "paternity": row.paternity,
        "marriage": row.marriage,
        "compassionate": row.compassionate,
        "unpaid": row.unpaid,
        "special": row.special,
        "business": row.business,
    }


def _team_user_ids(db: Session, user: User) -> list[int]:
    if not can_manage_people(user):
        raise HTTPException(status_code=403, detail="You do not have access to team data")
    return [user_id for user_id in scoped_user_ids(db, user) if user_id != user.id]


def _team_attendance(db: Session, user: User, limit: int) -> list[dict[str, Any]]:
    user_ids = _team_user_ids(db, user)
    if not user_ids:
        return []
    users = {row.id: row.name for row in db.query(User).filter(User.id.in_(user_ids)).all()}
    rows = (
        db.query(Attendance)
        .filter(Attendance.user_id.in_(user_ids))
        .order_by(Attendance.date.desc())
        .limit(limit)
        .all()
    )
    return [_serialize_attendance(row, users.get(row.user_id)) for row in rows]


def _team_requests(db: Session, user: User, limit: int) -> list[dict[str, Any]]:
    user_ids = _team_user_ids(db, user)
    if not user_ids:
        return []
    users = {row.id: row.name for row in db.query(User).filter(User.id.in_(user_ids)).all()}
    rows = (
        db.query(Request)
        .filter(Request.user_id.in_(user_ids))
        .order_by(Request.created_at.desc())
        .limit(limit)
        .all()
    )
    return [
        {
            "employee": users.get(row.user_id, "Unknown employee"),
            **_serialize_request(row, include_reason=False),
        }
        for row in rows
    ]


def _staff_information(
    db: Session,
    user: User,
    employee_identifier: str,
    include_certifications: bool,
) -> dict[str, Any]:
    user_ids = _team_user_ids(db, user)
    identifier = employee_identifier.strip()
    if not identifier:
        raise HTTPException(status_code=400, detail="Employee code or name is required")

    base_query = db.query(User).filter(User.id.in_(user_ids))
    exact_match = base_query.filter(User.emp_code == identifier.upper()).first()
    matches = [exact_match] if exact_match else base_query.filter(User.name.ilike(f"%{identifier}%")).limit(6).all()
    if not matches:
        raise HTTPException(status_code=404, detail="No authorized employee matches that name or code")
    if len(matches) > 1:
        return {
            "matches": [
                {"employee_code": row.emp_code, "name": row.name, "department": row.department}
                for row in matches
            ]
        }

    employee = matches[0]
    profile = db.query(EmployeeProfile).filter(EmployeeProfile.user_id == employee.id).first()
    result: dict[str, Any] = {
        "employee": {
            "employee_code": employee.emp_code,
            "name": employee.name,
            "department": (profile.department if profile else None) or employee.department,
            "position": profile.position if profile else None,
            "job_grade": profile.job_grade if profile else None,
            "job_level": profile.job_level if profile else None,
            "contract_type": profile.contract_type if profile else None,
            "employment_status": profile.employment_status if profile else None,
            "join_date": profile.join_date.isoformat() if profile and profile.join_date else None,
            "work_email": profile.work_email if profile else employee.email,
        }
    }
    if profile and normalize_role(user.role) == MANAGEMENT_HR_ROLE:
        result["contact_profile"] = {
            "profile_photo": profile.profile_photo,
            "phone": profile.phone,
            "personal_email": profile.personal_email,
            "address": profile.address,
            "permanent_address": profile.permanent_address,
        }
    if not include_certifications:
        return result

    training_records = (
        db.query(TrainingRecord)
        .filter(TrainingRecord.user_id == employee.id)
        .order_by(TrainingRecord.training_date.desc())
        .limit(20)
        .all()
    )
    certificate_documents = (
        db.query(EmployeeDocument)
        .filter(
            EmployeeDocument.user_id == employee.id,
            EmployeeDocument.doc_type.in_(["Certificate", "Training Record"]),
        )
        .order_by(EmployeeDocument.expiry_date.asc(), EmployeeDocument.created_at.desc())
        .all()
    )
    result["training_records"] = [
        {
            "title": row.title,
            "provider": row.provider,
            "training_date": row.training_date.isoformat() if row.training_date else None,
            "completion_status": row.completion_status,
            "assessment_result": row.assessment_result,
            "certification": row.certification,
            "skills_gained": row.skills_gained,
        }
        for row in training_records
    ]
    result["certificate_documents"] = [
        {
            "name": row.doc_name,
            "type": row.doc_type,
            "issue_date": row.issue_date.isoformat() if row.issue_date else None,
            "expiry_date": row.expiry_date.isoformat() if row.expiry_date else None,
            "status": row.status,
        }
        for row in certificate_documents
    ]
    return result


def _create_request(
    db: Session,
    user: User,
    request_type: str,
    request_date: str,
    leave_type: str | None,
    reason: str | None,
) -> dict[str, Any]:
    normalized_type = request_type.lower().strip()
    if normalized_type not in {"leave", "permission", "ot"}:
        raise HTTPException(status_code=400, detail="Request type must be leave, permission, or ot")

    try:
        parsed_date = date.fromisoformat(request_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Request date must be YYYY-MM-DD") from exc

    normalized_leave_type = (leave_type or "annual").lower().strip()
    if normalized_type == "leave" and normalized_leave_type not in LEAVE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported leave type")

    existing = (
        db.query(Request)
        .filter(
            Request.user_id == user.id,
            Request.type == normalized_type,
            Request.date == parsed_date,
            Request.status == "pending",
        )
        .first()
    )
    if existing and (normalized_type != "leave" or existing.leave_type == normalized_leave_type):
        return _serialize_request(existing) | {"created": False}

    statuses = _initial_stage_statuses(db, user, backup_user_id=None)
    record = Request(
        user_id=user.id,
        type=normalized_type,
        date=parsed_date,
        leave_type=normalized_leave_type if normalized_type == "leave" else None,
        backup_status=statuses["backup_status"],
        line_manager_status=statuses["line_manager_status"],
        department_head_status=statuses["department_head_status"],
        hr_status=statuses["hr_status"],
        reason=(reason or "Submitted through the AI assistant.").strip(),
        status="pending",
    )
    _sync_final_status(record)
    db.add(record)
    db.commit()
    db.refresh(record)

    if normalized_type == "ot":
        db.add(
            OtRequest(
                id=record.id,
                user_id=user.id,
                date=parsed_date,
                reason=record.reason,
                status="pending",
            )
        )
        db.commit()

    return _serialize_request(record) | {"created": True}


def _prepare_request(
    db: Session,
    user: User,
    conversation: AiConversation,
    request_type: str,
    request_date: str,
    leave_type: str | None,
    reason: str | None,
) -> dict[str, Any]:
    normalized_type = request_type.lower().strip()
    if normalized_type not in {"leave", "permission", "ot"}:
        raise HTTPException(status_code=400, detail="Request type must be leave, permission, or ot")

    try:
        parsed_date = date.fromisoformat(request_date)
    except ValueError as exc:
        raise HTTPException(status_code=400, detail="Request date must be YYYY-MM-DD") from exc

    normalized_leave_type = (leave_type or "annual").lower().strip()
    if normalized_type == "leave" and normalized_leave_type not in LEAVE_TYPES:
        raise HTTPException(status_code=400, detail="Unsupported leave type")

    payload = {
        "request_type": normalized_type,
        "request_date": parsed_date.isoformat(),
        "leave_type": normalized_leave_type if normalized_type == "leave" else None,
        "reason": (reason or "Submitted through the AI assistant.").strip(),
    }
    action = AiPendingAction(
        conversation_id=conversation.id,
        actor_id=user.id,
        action_type="create_request",
        payload_json=json.dumps(payload),
        expires_at=datetime.utcnow() + timedelta(minutes=PENDING_ACTION_TTL_MINUTES),
    )
    db.add(action)
    db.flush()
    return {
        "pending_action": {
            "action_id": action.public_id,
            "action_type": action.action_type,
            "status": "pending_confirmation",
            "expires_at": action.expires_at.isoformat(),
            "preview": {
                "type": payload["request_type"],
                "date": payload["request_date"],
                "leave_type": payload["leave_type"],
                "reason": payload["reason"],
            },
        }
    }


def _pending_action_for_user(db: Session, user: User, action_id: str) -> AiPendingAction:
    action = (
        db.query(AiPendingAction)
        .filter(AiPendingAction.public_id == action_id, AiPendingAction.actor_id == user.id)
        .first()
    )
    if not action:
        raise HTTPException(status_code=404, detail="Pending AI action not found")
    return action


def confirm_pending_action(db: Session, user: User, action_id: str) -> dict[str, Any]:
    action = _pending_action_for_user(db, user, action_id)
    if action.status != "pending":
        raise HTTPException(status_code=409, detail=f"This action is already {action.status}")
    if action.expires_at <= datetime.utcnow():
        action.status = "expired"
        db.commit()
        raise HTTPException(status_code=409, detail="This preview expired. Please ask the AI to prepare it again")
    if action.action_type != "create_request":
        raise HTTPException(status_code=400, detail="Unsupported pending AI action")

    payload = json.loads(action.payload_json)
    result = _create_request(
        db,
        user,
        payload["request_type"],
        payload["request_date"],
        payload.get("leave_type"),
        payload.get("reason"),
    )
    action.status = "confirmed"
    action.confirmed_at = datetime.utcnow()
    db.add(
        AiToolAudit(
            conversation_id=action.conversation_id,
            actor_id=user.id,
            tool_name="create_request",
            status="success",
            arguments_json=_json_for_audit(_sanitize_arguments(payload)),
            result_json=_json_for_audit(result),
        )
    )
    db.commit()
    return {
        "reply": f"Request #{result['id']} is {result['status']}.",
        "data": result,
        "action": {"tool": "create_request", "status": "success", "summary": _action_summary("create_request", result)},
    }


def cancel_pending_action(db: Session, user: User, action_id: str) -> dict[str, Any]:
    action = _pending_action_for_user(db, user, action_id)
    if action.status != "pending":
        raise HTTPException(status_code=409, detail=f"This action is already {action.status}")
    action.status = "cancelled"
    action.cancelled_at = datetime.utcnow()
    db.commit()
    return {"message": "Request preview cancelled"}


def _build_tools(db: Session, user: User, conversation: AiConversation):
    from langchain_core.tools import StructuredTool

    def prepare_request(
        request_type: str,
        request_date: str,
        leave_type: str | None = None,
        reason: str | None = None,
    ) -> dict[str, Any]:
        """Prepare a leave, permission, or overtime request preview for the current user only."""
        return _prepare_request(db, user, conversation, request_type, request_date, leave_type, reason)

    def get_my_attendance(limit: int = 30) -> list[dict[str, Any]]:
        """Get up to 60 recent attendance records for the current user."""
        return _my_attendance(db, user, max(1, min(limit, 60)))

    def get_my_requests(limit: int = 20) -> list[dict[str, Any]]:
        """Get up to 50 recent leave, permission, and overtime requests for the current user."""
        return _my_requests(db, user, max(1, min(limit, 50)))

    def get_my_leave_entitlements() -> dict[str, int]:
        """Get the current user's configured leave entitlements."""
        return _my_leave_entitlements(db, user)

    def get_team_attendance(limit: int = 50) -> list[dict[str, Any]]:
        """Get up to 100 recent attendance records for employees within the current manager's authorized scope."""
        return _team_attendance(db, user, max(1, min(limit, 100)))

    def get_team_requests(limit: int = 50) -> list[dict[str, Any]]:
        """Get up to 100 recent requests for employees within the current manager's authorized scope."""
        return _team_requests(db, user, max(1, min(limit, 100)))

    def get_staff_information(
        employee_identifier: str,
        include_certifications: bool = True,
    ) -> dict[str, Any]:
        """Get an authorized employee's work profile and optionally their training and certification details.

        Use an employee code when possible. For Management HR, the response also includes the staff member's
        profile photo and contact details. It always excludes identity, bank, salary, emergency-contact, and
        document-file details.
        """
        return _staff_information(db, user, employee_identifier, include_certifications)

    return [
        StructuredTool.from_function(prepare_request),
        StructuredTool.from_function(get_my_attendance),
        StructuredTool.from_function(get_my_requests),
        StructuredTool.from_function(get_my_leave_entitlements),
        StructuredTool.from_function(get_team_attendance),
        StructuredTool.from_function(get_team_requests),
        StructuredTool.from_function(get_staff_information),
    ]


def _content_text(content: Any) -> str:
    if isinstance(content, str):
        return content.strip()
    if isinstance(content, list):
        return "\n".join(
            item.get("text", "") if isinstance(item, dict) else str(item)
            for item in content
        ).strip()
    return str(content).strip()


def _action_summary(tool_name: str, result: Any) -> str:
    if isinstance(result, dict) and result.get("error"):
        return str(result["error"])
    if tool_name == "prepare_request":
        return "Request preview ready for confirmation"
    if tool_name == "get_staff_information":
        return "Staff profile and certifications retrieved"
    if tool_name == "create_request" and isinstance(result, dict):
        if not result.get("created", True):
            return f"Using existing pending request #{result.get('id')}"
        return f"Created request #{result.get('id')}"
    if isinstance(result, list):
        return f"Retrieved {len(result)} records"
    return "Retrieved requested information"


def _run_langchain_agent(
    db: Session,
    user: User,
    conversation: AiConversation,
    user_message: AiChatMessage,
) -> dict[str, Any]:
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage
    from langchain_openai import AzureChatOpenAI

    if not settings.azure_openai_api_key or not settings.azure_openai_endpoint:
        raise RuntimeError("Azure OpenAI is not configured")

    history = (
        db.query(AiChatMessage)
        .filter(AiChatMessage.conversation_id == conversation.id)
        .order_by(AiChatMessage.sequence.desc())
        .limit(max(1, settings.ai_history_message_limit))
        .all()
    )
    history.reverse()

    messages = [SystemMessage(content=_system_prompt(user))]
    for message in history:
        if message.role == "assistant":
            messages.append(AIMessage(content=message.content))
        else:
            messages.append(HumanMessage(content=message.content))

    tools = _build_tools(db, user, conversation)
    tools_by_name = {tool.name: tool for tool in tools}
    model = AzureChatOpenAI(
        azure_deployment=settings.azure_openai_deployment,
        api_version=settings.azure_openai_api_version,
        azure_endpoint=settings.azure_openai_endpoint,
        api_key=settings.azure_openai_api_key,
        temperature=0,
    ).bind_tools(tools)

    response = model.invoke(messages)
    actions: list[dict[str, Any]] = []
    data: Any = None
    pending_action: dict[str, Any] | None = None
    tool_calls = 0

    while response.tool_calls:
        messages.append(response)
        for call in response.tool_calls:
            call_id = str(call.get("id", ""))
            tool_name = str(call.get("name", ""))
            arguments = call.get("args") or {}
            if tool_calls >= settings.ai_max_tool_calls:
                result = {"error": "Tool-call limit reached for this message"}
                status = "blocked"
            elif tool_name not in tools_by_name:
                result = {"error": "Requested tool is not available"}
                status = "denied"
            else:
                tool_calls += 1
                try:
                    result = tools_by_name[tool_name].invoke(arguments)
                    status = "pending_confirmation" if isinstance(result, dict) and result.get("pending_action") else "success"
                    data = result
                    pending_action = result.get("pending_action") if isinstance(result, dict) else pending_action
                except HTTPException as exc:
                    result = {"error": exc.detail}
                    status = "denied"
                except Exception:
                    result = {"error": "The requested HCM action could not be completed"}
                    status = "error"

            _record_tool_audit(
                db,
                conversation,
                user_message,
                user,
                tool_name,
                status,
                arguments,
                result,
            )
            actions.append({"tool": tool_name, "status": status, "summary": _action_summary(tool_name, result)})
            messages.append(ToolMessage(content=json.dumps(result, default=str), tool_call_id=call_id))

        response = model.invoke(messages)

    reply = _content_text(response.content) or "I completed the requested action."
    return {
        "reply": reply,
        "intent": actions[-1]["tool"] if actions else "chat",
        "data": data,
        "actions": actions,
        "pending_action": pending_action,
    }


def _offline_response() -> dict[str, Any]:
    return {
        "reply": "The AI agent is not configured. Please ask an administrator to configure Azure OpenAI.",
        "intent": "unavailable",
        "data": None,
        "actions": [],
        "pending_action": None,
    }


def chat_with_ai(
    text: str,
    user: User,
    db: Session,
    conversation_id: str | None = None,
) -> dict[str, Any]:
    clean_text = text.strip()
    if not clean_text:
        raise HTTPException(status_code=400, detail="Message cannot be empty")

    conversation = _conversation_for_user(db, user, conversation_id, clean_text)
    user_message = _append_message(db, conversation, "user", clean_text)

    if settings.ai_provider.lower() != "azure":
        result = _offline_response()
    else:
        try:
            result = _run_langchain_agent(db, user, conversation, user_message)
        except Exception:
            result = {
                "reply": "I could not complete the AI response right now. Please check your requests before retrying an action.",
                "intent": "error",
                "data": None,
                "actions": [],
                "pending_action": None,
            }

    _append_message(db, conversation, "assistant", result["reply"])
    db.commit()
    return {**result, "conversation_id": conversation.public_id}


def list_conversations(db: Session, user: User) -> list[dict[str, Any]]:
    rows = (
        db.query(AiConversation)
        .filter(AiConversation.user_id == user.id)
        .order_by(AiConversation.updated_at.desc(), AiConversation.created_at.desc())
        .all()
    )
    return [
        {
            "conversation_id": row.public_id,
            "title": row.title,
            "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        }
        for row in rows
    ]


def get_conversation_messages(db: Session, user: User, conversation_id: str) -> dict[str, Any]:
    conversation = _conversation_for_user(db, user, conversation_id, "")
    rows = (
        db.query(AiChatMessage)
        .filter(AiChatMessage.conversation_id == conversation.id)
        .order_by(AiChatMessage.sequence.asc())
        .all()
    )
    return {
        "conversation_id": conversation.public_id,
        "messages": [{"role": row.role, "text": row.content} for row in rows],
    }
