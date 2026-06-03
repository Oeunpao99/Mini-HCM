import json
from datetime import date, datetime, time

from fastapi import APIRouter, Depends, HTTPException
from fastapi import Request as FastAPIRequest
from sqlalchemy.orm import Session

from app.api.deps import (
    DEPARTMENT_HEAD_ROLE,
    LINE_MANAGER_ROLE,
    MANAGEMENT_HR_ROLE,
    ensure_user_in_scope,
    get_current_user,
    get_db,
    normalize_role,
    require_roles,
    scoped_user_ids,
)
from app.models.request import Request
from app.models.app_setting import AppSetting
from app.models.user import User
from app.schemas.common import MessageResponse
from app.schemas.request import (
    ApprovalFlowIn,
    ApprovalFlowOut,
    CancelRequestIn,
    CreateRequestIn,
    RequestOut,
    UpdateRequestStatusIn,
)

router = APIRouter(prefix="/api/requests", tags=["requests"])

APPROVED = "approved"
PENDING = "pending"
REJECTED = "rejected"
SKIPPED = "skipped"
APPROVAL_FLOW_SETTING_KEY = "request_approval_flow"
DEFAULT_APPROVAL_FLOW = ["backup", "line_manager", "department_head", "management_hr"]
APPROVAL_STAGE_LABELS = {
    "backup": "Backup Person",
    "line_manager": "Line manager",
    "department_head": "Department head",
    "management_hr": "HR",
}
APPROVAL_STAGE_STATUS_KEYS = {
    "backup": "backup_status",
    "line_manager": "line_manager_status",
    "department_head": "department_head_status",
    "management_hr": "hr_status",
}


def _parse_time_field(val):
    if not val:
        return None
    if isinstance(val, time):
        return val
    try:
        return time.fromisoformat(val)
    except Exception:
        return None


def _initial_line_status(user: User) -> str:
    manager = user.manager
    if manager and normalize_role(manager.role) == LINE_MANAGER_ROLE:
        return PENDING
    return SKIPPED


def _initial_department_status(user: User) -> str:
    return SKIPPED if normalize_role(user.role) == DEPARTMENT_HEAD_ROLE else PENDING


def _normalize_approval_flow(stages: list[str] | None) -> list[str]:
    normalized = []
    for stage in stages or DEFAULT_APPROVAL_FLOW:
        if stage not in APPROVAL_STAGE_STATUS_KEYS or stage in normalized:
            continue
        normalized.append(stage)
    if not normalized:
        raise HTTPException(status_code=400, detail="Approval flow must include at least one stage")
    return normalized


def _get_approval_flow(db: Session) -> list[str]:
    setting = db.query(AppSetting).filter(AppSetting.key == APPROVAL_FLOW_SETTING_KEY).first()
    if not setting:
        return DEFAULT_APPROVAL_FLOW
    try:
        payload = json.loads(setting.value)
    except json.JSONDecodeError:
        return DEFAULT_APPROVAL_FLOW
    stages = payload.get("stages") if isinstance(payload, dict) else payload
    try:
        return _normalize_approval_flow(stages)
    except HTTPException:
        return DEFAULT_APPROVAL_FLOW


def _stage_status(row: Request, stage: str) -> str:
    return getattr(row, APPROVAL_STAGE_STATUS_KEYS[stage])


def _set_stage_status(row: Request, stage: str, status: str, actor_id: int | None, now: datetime) -> None:
    if stage == "backup":
        row.backup_status = status
        row.backup_approved_at = now if status == APPROVED else None
    elif stage == "line_manager":
        row.line_manager_status = status
        row.line_manager_approved_by = actor_id if status == APPROVED else None
        row.line_manager_approved_at = now if status == APPROVED else None
    elif stage == "department_head":
        row.department_head_status = status
        row.department_head_approved_by = actor_id if status == APPROVED else None
        row.department_head_approved_at = now if status == APPROVED else None
    elif stage == "management_hr":
        row.hr_status = status
        row.hr_approved_by = actor_id if status == APPROVED else None
        row.hr_approved_at = now if status == APPROVED else None


def _current_pending_stage(row: Request, flow: list[str]) -> str | None:
    for stage in flow:
        if _stage_status(row, stage) == PENDING:
            return stage
    for stage in DEFAULT_APPROVAL_FLOW:
        if stage not in flow and _stage_status(row, stage) == PENDING:
            return stage
    return None


def _initial_stage_statuses(db: Session, user: User, backup_user_id: int | None) -> dict[str, str]:
    flow = set(_get_approval_flow(db))
    return {
        "backup_status": PENDING if "backup" in flow and backup_user_id else SKIPPED,
        "line_manager_status": _initial_line_status(user) if "line_manager" in flow else SKIPPED,
        "department_head_status": _initial_department_status(user) if "department_head" in flow else SKIPPED,
        "hr_status": PENDING if "management_hr" in flow else SKIPPED,
    }


def _sync_final_status(row: Request) -> None:
    stages = [
        row.backup_status,
        row.line_manager_status,
        row.department_head_status,
        row.hr_status,
    ]
    if any(stage == REJECTED for stage in stages):
        row.status = REJECTED
    elif all(stage in {APPROVED, SKIPPED} for stage in stages):
        row.status = APPROVED
    else:
        row.status = PENDING


def _can_department_approve(actor: User, requester: User) -> bool:
    return (
        normalize_role(actor.role) == DEPARTMENT_HEAD_ROLE
        and actor.department
        and actor.department == requester.department
    )


@router.get("/approval-flow", response_model=ApprovalFlowOut)
def get_approval_flow(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    return ApprovalFlowOut(stages=_get_approval_flow(db))


@router.put("/approval-flow", response_model=ApprovalFlowOut)
def update_approval_flow(
    payload: ApprovalFlowIn,
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(MANAGEMENT_HR_ROLE)),
):
    stages = _normalize_approval_flow(payload.stages)
    setting = db.query(AppSetting).filter(AppSetting.key == APPROVAL_FLOW_SETTING_KEY).first()
    value = json.dumps({"stages": stages})
    if setting:
        setting.value = value
    else:
        db.add(AppSetting(key=APPROVAL_FLOW_SETTING_KEY, value=value))
    db.commit()
    return ApprovalFlowOut(stages=stages)


@router.post("/create", response_model=RequestOut)
async def create_request(
    request: FastAPIRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Support both application/json and multipart/form-data uploads from the frontend.
    content_type = request.headers.get("content-type", "")
    payload = {}
    attachment = None
    if "multipart/form-data" in content_type:
        form = await request.form()
        # form fields are strings; parse where needed
        payload["type"] = form.get("type")
        payload["date"] = form.get("date")
        payload["start_time"] = form.get("start_time") or None
        payload["end_time"] = form.get("end_time") or None
        payload["leave_type"] = form.get("leave_type") or None
        payload["backup_user_id"] = form.get("backup_user_id") or None
        payload["reason"] = form.get("reason") or None
        attachment = form.get("attachment")
    else:
        payload = await request.json()

    if not payload.get("type") or payload.get("type") not in {"leave", "permission", "flexible", "ot"}:
        raise HTTPException(status_code=400, detail="Invalid request type")

    # parse date and time strings if necessary
    parsed_date = payload.get("date")
    if isinstance(parsed_date, str):
        try:
            parsed_date = date.fromisoformat(parsed_date)
        except Exception:
            raise HTTPException(status_code=400, detail="Invalid date format")

    parsed_start = _parse_time_field(payload.get("start_time"))
    parsed_end = _parse_time_field(payload.get("end_time"))
    backup_user_id = payload.get("backup_user_id")
    if backup_user_id in {"", None}:
        backup_user_id = None
    else:
        backup_user_id = int(backup_user_id)
        if backup_user_id == user.id:
            raise HTTPException(status_code=400, detail="Backup person cannot be yourself")
        backup_user = db.query(User).filter(User.id == backup_user_id).first()
        if not backup_user:
            raise HTTPException(status_code=400, detail="Backup person not found")
        if backup_user.department != user.department:
            raise HTTPException(status_code=400, detail="Backup person must be in your department")

    stage_statuses = _initial_stage_statuses(db, user, backup_user_id)

    req = Request(
        user_id=user.id,
        type=payload.get("type"),
        date=parsed_date,
        start_time=parsed_start,
        end_time=parsed_end,
        leave_type=payload.get("leave_type") or None,
        backup_user_id=backup_user_id,
        backup_status=stage_statuses["backup_status"],
        line_manager_status=stage_statuses["line_manager_status"],
        department_head_status=stage_statuses["department_head_status"],
        hr_status=stage_statuses["hr_status"],
        reason=payload.get("reason"),
        status="pending",
    )
    _sync_final_status(req)
    db.add(req)
    db.commit()
    db.refresh(req)

    # TODO: persist attachment if provided (store on disk or cloud). Currently ignored.

    return req


@router.get("/my", response_model=list[RequestOut])
def my_requests(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return db.query(Request).filter(Request.user_id == user.id).order_by(Request.created_at.desc()).all()


@router.get("/backup-options")
def backup_options(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    query = db.query(User).filter(User.id != user.id)
    if user.department:
        query = query.filter(User.department == user.department)
    return [
        {
            "id": row.id,
            "emp_code": row.emp_code,
            "name": row.name,
            "role": normalize_role(row.role),
            "department": row.department,
        }
        for row in query.order_by(User.name.asc()).all()
    ]


@router.get("/assigned-to-me", response_model=list[RequestOut])
def requests_assigned_to_me(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return (
        db.query(Request)
        .filter(Request.backup_user_id == user.id)
        .order_by(Request.created_at.desc())
        .all()
    )


@router.put("/status", response_model=RequestOut)
def update_status(
    payload: UpdateRequestStatusIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    if payload.status not in {"approved", "rejected"}:
        raise HTTPException(status_code=400, detail="Status must be approved or rejected")

    row = db.query(Request).filter(Request.id == payload.request_id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")

    requester = db.query(User).filter(User.id == row.user_id).first()
    if not requester:
        raise HTTPException(status_code=404, detail="Request owner not found")

    now = datetime.now()
    actor_role = normalize_role(user.role)
    flow = _get_approval_flow(db)
    pending_stage = _current_pending_stage(row, flow)
    if not pending_stage:
        _sync_final_status(row)
        db.commit()
        db.refresh(row)
        return row

    if pending_stage == "backup":
        if user.id != row.backup_user_id:
            raise HTTPException(status_code=400, detail=f"Request is pending on {APPROVAL_STAGE_LABELS[pending_stage]}")
    elif pending_stage == "line_manager":
        if actor_role != LINE_MANAGER_ROLE:
            raise HTTPException(status_code=400, detail=f"Request is pending on {APPROVAL_STAGE_LABELS[pending_stage]}")
        ensure_user_in_scope(db, user, row.user_id)
    elif pending_stage == "department_head":
        if actor_role != DEPARTMENT_HEAD_ROLE or not _can_department_approve(user, requester):
            raise HTTPException(status_code=400, detail=f"Request is pending on {APPROVAL_STAGE_LABELS[pending_stage]}")
    elif pending_stage == "management_hr":
        if actor_role != MANAGEMENT_HR_ROLE:
            raise HTTPException(status_code=400, detail=f"Request is pending on {APPROVAL_STAGE_LABELS[pending_stage]}")
    else:
        raise HTTPException(status_code=403, detail="Forbidden")

    _set_stage_status(row, pending_stage, payload.status, user.id, now)

    _sync_final_status(row)
    row.admin_remarks = payload.admin_remarks
    db.commit()
    db.refresh(row)
    return row


@router.put("/cancel", response_model=MessageResponse)
def cancel_request(
    payload: CancelRequestIn,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    row = db.query(Request).filter(Request.id == payload.request_id, Request.user_id == user.id).first()
    if not row:
        raise HTTPException(status_code=404, detail="Request not found")
    if row.status != "pending":
        raise HTTPException(status_code=400, detail="Only pending requests can be cancelled")

    row.status = "cancelled"
    db.commit()
    return MessageResponse(message="Request cancelled")


@router.get("/all", response_model=list[RequestOut])
def all_requests(
    db: Session = Depends(get_db),
    user: User = Depends(require_roles(LINE_MANAGER_ROLE, DEPARTMENT_HEAD_ROLE, MANAGEMENT_HR_ROLE)),
):
    user_ids = scoped_user_ids(db, user, include_self=True)
    return (
        db.query(Request)
        .filter(Request.user_id.in_(user_ids))
        .order_by(Request.created_at.desc())
        .all()
    )
