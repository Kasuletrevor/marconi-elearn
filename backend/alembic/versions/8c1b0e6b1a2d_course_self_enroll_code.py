"""course_self_enroll_code

Revision ID: 8c1b0e6b1a2d
Revises: 3a2c4d9dd0b1
Create Date: 2026-01-11 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa

revision = "8c1b0e6b1a2d"
down_revision = "3a2c4d9dd0b1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "courses",
        sa.Column(
            "self_enroll_enabled",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("false"),
        ),
    )
    op.add_column(
        "courses",
        sa.Column("self_enroll_code", sa.String(length=32), nullable=True),
    )
    op.create_unique_constraint(
        "uq_courses_self_enroll_code",
        "courses",
        ["self_enroll_code"],
    )


def downgrade() -> None:
    op.drop_constraint("uq_courses_self_enroll_code", "courses", type_="unique")
    op.drop_column("courses", "self_enroll_code")
    op.drop_column("courses", "self_enroll_enabled")

