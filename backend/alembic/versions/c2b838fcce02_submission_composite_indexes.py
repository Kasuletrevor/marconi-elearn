"""submission composite indexes

Revision ID: c2b838fcce02
Revises: e516db6984fd
Create Date: 2026-01-13 17:00:08.354945

"""

from alembic import op
import sqlalchemy as sa


revision = 'c2b838fcce02'
down_revision = 'e516db6984fd'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_index(
        "ix_submissions_assignment_id_user_id",
        "submissions",
        ["assignment_id", "user_id"],
        unique=False,
    )
    op.create_index(
        "ix_submissions_user_id_id",
        "submissions",
        ["user_id", "id"],
        unique=False,
    )
    op.create_index(
        "ix_submissions_status_created_at",
        "submissions",
        ["status", "created_at"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_submissions_status_created_at", table_name="submissions")
    op.drop_index("ix_submissions_user_id_id", table_name="submissions")
    op.drop_index("ix_submissions_assignment_id_user_id", table_name="submissions")
