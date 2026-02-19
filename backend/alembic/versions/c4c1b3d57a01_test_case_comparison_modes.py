"""test_case_comparison_modes

Revision ID: c4c1b3d57a01
Revises: 92d4a5f1a0bd
Create Date: 2026-02-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "c4c1b3d57a01"
down_revision = "92d4a5f1a0bd"
branch_labels = None
depends_on = None


_COMPARISON_MODE_CHECK = (
    "comparison_mode IN ('trim', 'exact', 'ignore_whitespace', 'ignore_case')"
)


def upgrade() -> None:
    op.add_column(
        "test_cases",
        sa.Column(
            "comparison_mode",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'trim'"),
        ),
    )
    op.add_column(
        "assignment_autograde_test_cases",
        sa.Column(
            "comparison_mode",
            sa.String(length=32),
            nullable=False,
            server_default=sa.text("'trim'"),
        ),
    )
    op.create_check_constraint(
        "ck_test_cases_comparison_mode",
        "test_cases",
        _COMPARISON_MODE_CHECK,
    )
    op.create_check_constraint(
        "ck_assignment_autograde_test_cases_comparison_mode",
        "assignment_autograde_test_cases",
        _COMPARISON_MODE_CHECK,
    )


def downgrade() -> None:
    op.drop_constraint(
        "ck_assignment_autograde_test_cases_comparison_mode",
        "assignment_autograde_test_cases",
        type_="check",
    )
    op.drop_constraint(
        "ck_test_cases_comparison_mode",
        "test_cases",
        type_="check",
    )
    op.drop_column("assignment_autograde_test_cases", "comparison_mode")
    op.drop_column("test_cases", "comparison_mode")
