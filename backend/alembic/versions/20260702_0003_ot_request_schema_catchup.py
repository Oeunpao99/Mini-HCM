"""Catch up OT request schema.

Revision ID: 20260702_0003
Revises: 20260702_0002
Create Date: 2026-07-02
"""

from alembic import op


revision = "20260702_0003"
down_revision = "20260702_0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS ot_type VARCHAR(30)")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS total_hours DECIMAL(5, 2)")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS project_task TEXT")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS backup_user_id INTEGER")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS backup_status VARCHAR(20) DEFAULT 'skipped'")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS backup_approved_at TIMESTAMP")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS line_manager_status VARCHAR(20) DEFAULT 'pending'")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS line_manager_approved_by INTEGER")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS line_manager_approved_at TIMESTAMP")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS department_head_status VARCHAR(20) DEFAULT 'pending'")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS department_head_approved_by INTEGER")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS department_head_approved_at TIMESTAMP")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS hr_status VARCHAR(20) DEFAULT 'pending'")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS hr_approved_by INTEGER")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS hr_approved_at TIMESTAMP")
    op.execute("ALTER TABLE IF EXISTS ot_requests ADD COLUMN IF NOT EXISTS admin_remarks TEXT")


def downgrade() -> None:
    pass
