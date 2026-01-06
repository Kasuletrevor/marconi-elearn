"""course_and_assignment_fields

Revision ID: 9b2de2d9f6d1
Revises: 4d6b8a62f3f3
Create Date: 2026-01-06 10:30:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "9b2de2d9f6d1"
down_revision = "4d6b8a62f3f3"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "organizations",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.add_column(
        "organizations",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.add_column("courses", sa.Column("semester", sa.String(length=50), nullable=True))
    op.add_column("courses", sa.Column("year", sa.Integer(), nullable=True))
    op.add_column(
        "courses",
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.add_column(
        "courses",
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )

    op.add_column("assignments", sa.Column("due_date", sa.DateTime(timezone=True), nullable=True))
    op.add_column(
        "assignments",
        sa.Column("max_points", sa.Integer(), server_default="100", nullable=False),
    )


def downgrade() -> None:
    op.drop_column("assignments", "max_points")
    op.drop_column("assignments", "due_date")

    op.drop_column("courses", "updated_at")
    op.drop_column("courses", "created_at")
    op.drop_column("courses", "year")
    op.drop_column("courses", "semester")

    op.drop_column("organizations", "updated_at")
    op.drop_column("organizations", "created_at")

