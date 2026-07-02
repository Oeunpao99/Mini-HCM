"""Normalize legacy training record statuses.

Revision ID: 20260702_0002
Revises: 20260702_0001
Create Date: 2026-07-02
"""

from alembic import op


revision = "20260702_0002"
down_revision = "20260702_0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('training_records') IS NOT NULL THEN
                UPDATE training_records
                SET status = CASE
                    WHEN lower(status::text) IN ('approved', 'completed', 'complete') THEN 'Approved'
                    WHEN lower(status::text) IN ('rejected', 'cancelled', 'canceled') THEN 'Rejected'
                    ELSE 'Draft'
                END
                WHERE status IS NULL
                   OR status::text NOT IN ('Draft', 'Approved', 'Rejected');
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    pass
