from typing import Any

from fastapi import APIRouter, Depends
from pydantic import BaseModel, Field
from sqlalchemy.orm import Session

from app.api.deps import get_current_user, get_db
from app.models.user import User
from app.services.ai_service import (
    cancel_pending_action,
    chat_with_ai,
    confirm_pending_action,
    get_conversation_messages,
    list_conversations,
)

router = APIRouter(prefix="/api/ai", tags=["ai"])


class ChatRequest(BaseModel):
    message: str
    conversation_id: str | None = None


class ChatResponse(BaseModel):
    reply: str
    intent: str
    data: Any | None = None
    conversation_id: str
    actions: list[dict[str, Any]] = Field(default_factory=list)
    pending_action: dict[str, Any] | None = None


@router.post("/chat", response_model=ChatResponse)
def ai_chat(
    payload: ChatRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    result = chat_with_ai(payload.message, user, db, payload.conversation_id)
    return ChatResponse(
        reply=result["reply"],
        intent=result["intent"],
        data=result.get("data"),
        conversation_id=result["conversation_id"],
        actions=result.get("actions", []),
        pending_action=result.get("pending_action"),
    )


@router.post("/actions/{action_id}/confirm")
def confirm_action(
    action_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return confirm_pending_action(db, user, action_id)


@router.post("/actions/{action_id}/cancel")
def cancel_action(
    action_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return cancel_pending_action(db, user, action_id)


@router.get("/conversations")
def conversations(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return {"conversations": list_conversations(db, user)}


@router.get("/conversations/{conversation_id}/messages")
def conversation_messages(
    conversation_id: str,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    return get_conversation_messages(db, user, conversation_id)
