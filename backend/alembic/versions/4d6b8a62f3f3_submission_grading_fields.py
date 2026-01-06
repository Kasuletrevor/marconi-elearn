"""submission_grading_fields

Revision ID: 4d6b8a62f3f3
Revises: a51bd2a0f2c4
Create Date: 2026-01-06 10:12:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "4d6b8a62f3f3"
down_revision = "a51bd2a0f2c4"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("CREATE TYPE submission_status AS ENUM ('pending','grading','graded','error')")
    op.add_column(
        "submissions",
        sa.Column("status", sa.Enum("pending", "grading", "graded", "error", name="submission_status"), nullable=False, server_default="pending"),
    )
    op.add_column("submissions", sa.Column("score", sa.Integer(), nullable=True))
    op.add_column("submissions", sa.Column("feedback", sa.Text(), nullable=True))
    op.create_index(op.f("ix_submissions_status"), "submissions", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_submissions_status"), table_name="submissions")
    op.drop_column("submissions", "feedback")
    op.drop_column("submissions", "score")
    op.drop_column("submissions", "status")
    op.execute("DROP TYPE submission_status")

