"""Add agent pending actions for explicit confirmation.

Revision ID: 20260717_0006
Revises: 20260717_0005
Create Date: 2026-07-17
"""

import sqlalchemy as sa
from alembic import op


revision = "20260717_0006"
down_revision = "20260717_0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "ai_pending_actions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("public_id", sa.String(length=36), nullable=False, unique=True),
        sa.Column("conversation_id", sa.Integer(), sa.ForeignKey("ai_conversations.id"), nullable=False),
        sa.Column("actor_id", sa.Integer(), sa.ForeignKey("users.id"), nullable=False),
        sa.Column("action_type", sa.String(length=80), nullable=False),
        sa.Column("payload_json", sa.Text(), nullable=False),
        sa.Column("status", sa.String(length=20), nullable=False, server_default="pending"),
        sa.Column("created_at", sa.DateTime(), nullable=False, server_default=sa.text("CURRENT_TIMESTAMP")),
        sa.Column("expires_at", sa.DateTime(), nullable=False),
        sa.Column("confirmed_at", sa.DateTime(), nullable=True),
        sa.Column("cancelled_at", sa.DateTime(), nullable=True),
    )
    op.create_index("ix_ai_pending_actions_public_id", "ai_pending_actions", ["public_id"])
    op.create_index("ix_ai_pending_actions_conversation_id", "ai_pending_actions", ["conversation_id"])
    op.create_index("ix_ai_pending_actions_actor_id", "ai_pending_actions", ["actor_id"])


def downgrade() -> None:
    op.drop_index("ix_ai_pending_actions_actor_id", table_name="ai_pending_actions")
    op.drop_index("ix_ai_pending_actions_conversation_id", table_name="ai_pending_actions")
    op.drop_index("ix_ai_pending_actions_public_id", table_name="ai_pending_actions")
    op.drop_table("ai_pending_actions")
