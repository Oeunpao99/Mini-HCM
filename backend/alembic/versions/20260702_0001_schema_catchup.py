"""Catch up existing local/prod schemas.

Revision ID: 20260702_0001
Revises:
Create Date: 2026-07-02
"""

from alembic import op


revision = "20260702_0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS plan_id INTEGER")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS user_id INTEGER")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS title VARCHAR(200)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS training_type VARCHAR(50)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS category VARCHAR(50)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS provider VARCHAR(200)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS training_date DATE")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS end_date DATE")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS duration DECIMAL(6, 1)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS training_method VARCHAR(50)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS attendance_status VARCHAR(30)")
    op.execute(
        "ALTER TABLE IF EXISTS training_records "
        "ADD COLUMN IF NOT EXISTS completion_status VARCHAR(30) DEFAULT 'In Progress'"
    )
    op.execute(
        "ALTER TABLE IF EXISTS training_records "
        "ADD COLUMN IF NOT EXISTS assessment_result VARCHAR(30) DEFAULT 'Not Applicable'"
    )
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS score DECIMAL(5, 2)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS skills_gained TEXT")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS certification VARCHAR(10)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS related_kpi_id INTEGER")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS related_job_role VARCHAR(100)")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS certificate_file TEXT")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS feedback_file TEXT")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS verified_by INTEGER")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS status VARCHAR(30) DEFAULT 'Draft'")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS remarks TEXT")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS created_at TIMESTAMP")
    op.execute("ALTER TABLE IF EXISTS training_records ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP")

    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('performance_reviews') IS NOT NULL
               AND to_regtype('review_period_type') IS NOT NULL THEN
                UPDATE performance_reviews
                SET review_period = (
                    CASE
                        WHEN review_period::text ~ '^[0-9]{4}-Q[12]$' THEN 'Semester 1'
                        WHEN review_period::text ~ '^[0-9]{4}-Q[34]$' THEN 'Semester 2'
                        ELSE 'Annual'
                    END
                )::review_period_type
                WHERE review_period::text NOT IN ('Probation', 'Semester 1', 'Semester 2', 'Annual');
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    pass
