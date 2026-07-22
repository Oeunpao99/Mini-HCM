from datetime import datetime, timedelta
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Index, Integer, String, Text, UniqueConstraint, func
from sqlalchemy.orm import relationship

from app.db.session import Base


class AiConversation(Base):
    __tablename__ = "ai_conversations"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid4()), index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    title = Column(String(120), nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now(), nullable=False)

    messages = relationship("AiChatMessage", back_populates="conversation", cascade="all, delete-orphan")
    tool_audits = relationship("AiToolAudit", back_populates="conversation", cascade="all, delete-orphan")
    pending_actions = relationship("AiPendingAction", back_populates="conversation", cascade="all, delete-orphan")


class AiChatMessage(Base):
    __tablename__ = "ai_chat_messages"
    __table_args__ = (
        UniqueConstraint("conversation_id", "sequence", name="uq_ai_chat_messages_conversation_sequence"),
        Index("ix_ai_chat_messages_conversation_sequence", "conversation_id", "sequence"),
    )

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id"), nullable=False, index=True)
    sequence = Column(Integer, nullable=False)
    role = Column(String(20), nullable=False)
    content = Column(Text, nullable=False)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("AiConversation", back_populates="messages")


class AiToolAudit(Base):
    __tablename__ = "ai_tool_audits"
    __table_args__ = (
        Index("ix_ai_tool_audits_conversation_created", "conversation_id", "created_at"),
    )

    id = Column(Integer, primary_key=True, index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id"), nullable=False, index=True)
    message_id = Column(Integer, ForeignKey("ai_chat_messages.id"), nullable=True, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    tool_name = Column(String(100), nullable=False)
    status = Column(String(20), nullable=False)
    arguments_json = Column(Text, nullable=True)
    result_json = Column(Text, nullable=True)
    created_at = Column(DateTime, server_default=func.now(), nullable=False)

    conversation = relationship("AiConversation", back_populates="tool_audits")


class AiPendingAction(Base):
    __tablename__ = "ai_pending_actions"

    id = Column(Integer, primary_key=True, index=True)
    public_id = Column(String(36), unique=True, nullable=False, default=lambda: str(uuid4()), index=True)
    conversation_id = Column(Integer, ForeignKey("ai_conversations.id"), nullable=False, index=True)
    actor_id = Column(Integer, ForeignKey("users.id"), nullable=False, index=True)
    action_type = Column(String(80), nullable=False)
    payload_json = Column(Text, nullable=False)
    status = Column(String(20), nullable=False, default="pending")
    created_at = Column(DateTime, server_default=func.now(), nullable=False)
    expires_at = Column(DateTime, nullable=False, default=lambda: datetime.utcnow() + timedelta(minutes=10))
    confirmed_at = Column(DateTime, nullable=True)
    cancelled_at = Column(DateTime, nullable=True)

    conversation = relationship("AiConversation", back_populates="pending_actions")
