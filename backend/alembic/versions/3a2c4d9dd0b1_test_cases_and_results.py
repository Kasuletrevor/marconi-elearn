"""test_cases_and_results

Revision ID: 3a2c4d9dd0b1
Revises: 4d00eb34a513
Create Date: 2026-01-10 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "3a2c4d9dd0b1"
down_revision = "4d00eb34a513"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "test_cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "assignment_id",
            sa.Integer(),
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("stdin", sa.Text(), nullable=False, server_default=""),
        sa.Column("expected_stdout", sa.Text(), nullable=False, server_default=""),
        sa.Column("expected_stderr", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(op.f("ix_test_cases_assignment_id"), "test_cases", ["assignment_id"], unique=False)

    op.create_table(
        "submission_test_results",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "submission_id",
            sa.Integer(),
            sa.ForeignKey("submissions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "test_case_id",
            sa.Integer(),
            sa.ForeignKey("test_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("passed", sa.Boolean(), nullable=False),
        sa.Column("outcome", sa.Integer(), nullable=False),
        sa.Column("compile_output", sa.Text(), nullable=False, server_default=""),
        sa.Column("stdout", sa.Text(), nullable=False, server_default=""),
        sa.Column("stderr", sa.Text(), nullable=False, server_default=""),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now()),
    )
    op.create_index(
        op.f("ix_submission_test_results_submission_id"),
        "submission_test_results",
        ["submission_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_submission_test_results_test_case_id"),
        "submission_test_results",
        ["test_case_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_submission_test_results_test_case_id"), table_name="submission_test_results")
    op.drop_index(op.f("ix_submission_test_results_submission_id"), table_name="submission_test_results")
    op.drop_table("submission_test_results")

    op.drop_index(op.f("ix_test_cases_assignment_id"), table_name="test_cases")
    op.drop_table("test_cases")

