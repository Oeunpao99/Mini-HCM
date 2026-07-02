"""Relax legacy training record start date.

Revision ID: 20260702_0004
Revises: 20260702_0003
Create Date: 2026-07-02
"""

from alembic import op


revision = "20260702_0004"
down_revision = "20260702_0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        DO $$
        BEGIN
            IF to_regclass('training_records') IS NOT NULL
               AND EXISTS (
                   SELECT 1
                   FROM information_schema.columns
                   WHERE table_name = 'training_records'
                     AND column_name = 'start_date'
               ) THEN
                UPDATE training_records
                SET training_date = COALESCE(training_date, start_date),
                    start_date = COALESCE(start_date, training_date, CURRENT_DATE);
                ALTER TABLE training_records ALTER COLUMN start_date DROP NOT NULL;
            END IF;
        END $$;
        """
    )


def downgrade() -> None:
    pass
