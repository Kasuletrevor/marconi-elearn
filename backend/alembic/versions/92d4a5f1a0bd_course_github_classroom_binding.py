"""course github classroom binding

Revision ID: 92d4a5f1a0bd
Revises: 7e1bc1d9516c
Create Date: 2026-02-05 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa


revision = "92d4a5f1a0bd"
down_revision = "7e1bc1d9516c"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("courses", sa.Column("github_classroom_id", sa.Integer(), nullable=True))
    op.add_column("courses", sa.Column("github_classroom_name", sa.String(length=200), nullable=True))
    op.create_index(
        "ix_courses_github_classroom_id",
        "courses",
        ["github_classroom_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_courses_github_classroom_id", table_name="courses")
    op.drop_column("courses", "github_classroom_name")
    op.drop_column("courses", "github_classroom_id")
