"""late policy and extensions

Revision ID: c78a4805b10c
Revises: 6f1d9c8a7b0e
Create Date: 2026-01-08 01:48:10.589209

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = 'c78a4805b10c'
down_revision = '6f1d9c8a7b0e'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("assignments", sa.Column("late_policy", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("courses", sa.Column("late_policy", postgresql.JSONB(astext_type=sa.Text()), nullable=True))

    op.create_table(
        "assignment_extensions",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("extended_due_date", sa.DateTime(timezone=True), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("assignment_id", "user_id", name="uq_assignment_extension_assignment_user"),
    )
    op.create_index(op.f("ix_assignment_extensions_assignment_id"), "assignment_extensions", ["assignment_id"], unique=False)
    op.create_index(op.f("ix_assignment_extensions_user_id"), "assignment_extensions", ["user_id"], unique=False)
    op.create_index(op.f("ix_assignment_extensions_extended_due_date"), "assignment_extensions", ["extended_due_date"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_assignment_extensions_extended_due_date"), table_name="assignment_extensions")
    op.drop_index(op.f("ix_assignment_extensions_user_id"), table_name="assignment_extensions")
    op.drop_index(op.f("ix_assignment_extensions_assignment_id"), table_name="assignment_extensions")
    op.drop_table("assignment_extensions")

    op.drop_column("courses", "late_policy")
    op.drop_column("assignments", "late_policy")
