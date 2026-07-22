"""Add persistent AI conversations and tool audit records.

Revision ID: 20260717_0005
Revises: 20260702_0004
Create Date: 2026-07-17
"""

import sqlalchemy as sa
from alembic import op


revision = "20260717_0005"
down_revision = "20260702_0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_conversations",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("user_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("title", sa.String(length=120), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("updated_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ai_conversations_public_id", "ai_conversations", ["public_id"])
    op.create_index("ix_ai_conversations_user_id", "ai_conversations", ["user_id"])

    op.create_table(
        "ai_chat_messages",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("ai_conversations.id"), nullable=False),
        sa.Column("sequence", sa.Integer(), nullable=False),
        sa.Column("role", sa.String(length=20), nullable=False),
        sa.Column("content", sa.Text(), nullable=False),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.UniqueConstraint("conversation_id", "sequence", name="uq_ai_chat_messages_conversation_sequence"),
    )
    op.create_index("ix_ai_chat_messages_conversation_id", "ai_chat_messages", ["conversation_id"])
    op.create_index(
        "ix_ai_chat_messages_conversation_sequence",
        "ai_chat_messages",
        ["conversation_id", "sequence"],
    )

    op.create_table(
        "ai_tool_audits",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("ai_conversations.id"), nullable=False),
        sa.Column("message_id", sa.Integer(), sa.ForeignKey("ai_chat_messages.id"), nullable=True),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("tool_name", sa.String(length=100), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False),
        sa.Column("arguments_json", sa.Text(), nullable=True),
        sa.Column("result_json", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
    )
    op.create_index("ix_ai_tool_audits_conversation_id", "ai_tool_audits", ["conversation_id"])
    op.create_index("ix_ai_tool_audits_message_id", "ai_tool_audits", ["message_id"])
    op.create_index("ix_ai_tool_audits_actor_id", "ai_tool_audits", ["actor_id"])
    op.create_index("ix_ai_tool_audits_conversation_created", "ai_tool_audits", ["conversation_id", "created_at"])


def downgrade() -> None:
    op.drop_index("ix_ai_tool_audits_conversation_created", table_name="ai_tool_audits")
    op.drop_index("ix_ai_tool_audits_actor_id", table_name="ai_tool_audits")
    op.drop_index("ix_ai_tool_audits_message_id", table_name="ai_tool_audits")
    op.drop_index("ix_ai_tool_audits_conversation_id", table_name="ai_tool_audits")
    op.drop_table("ai_tool_audits")
    op.drop_index("ix_ai_chat_messages_conversation_sequence", table_name="ai_chat_messages")
    op.drop_index("ix_ai_chat_messages_conversation_id", table_name="ai_chat_messages")
    op.drop_table("ai_chat_messages")
    op.drop_index("ix_ai_conversations_user_id", table_name="ai_conversations")
    op.drop_index("ix_ai_conversations_public_id", table_name="ai_conversations")
    op.drop_table("ai_conversations")
