"""grading_events_observability

Revision ID: f1a2d3c4b5e6
Revises: c4c1b3d57a01
Create Date: 2026-02-19 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "f1a2d3c4b5e6"
down_revision = "c4c1b3d57a01"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "grading_events",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("submission_id", sa.Integer(), nullable=True),
        sa.Column("phase", sa.String(length=16), nullable=False),
        sa.Column("event_type", sa.String(length=32), nullable=False),
        sa.Column("attempt", sa.Integer(), nullable=False, server_default=sa.text("0")),
        sa.Column("reason", sa.String(length=64), nullable=True),
        sa.Column("context", sa.String(length=64), nullable=True),
        sa.Column("duration_ms", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["submission_id"], ["submissions.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_grading_events_submission_id"), "grading_events", ["submission_id"], unique=False)
    op.create_index(op.f("ix_grading_events_phase"), "grading_events", ["phase"], unique=False)
    op.create_index(op.f("ix_grading_events_event_type"), "grading_events", ["event_type"], unique=False)
    op.create_index(op.f("ix_grading_events_reason"), "grading_events", ["reason"], unique=False)
    op.create_index("ix_grading_events_phase_event_type", "grading_events", ["phase", "event_type"], unique=False)
    op.create_index("ix_grading_events_created_at", "grading_events", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_grading_events_created_at", table_name="grading_events")
    op.drop_index("ix_grading_events_phase_event_type", table_name="grading_events")
    op.drop_index(op.f("ix_grading_events_reason"), table_name="grading_events")
    op.drop_index(op.f("ix_grading_events_event_type"), table_name="grading_events")
    op.drop_index(op.f("ix_grading_events_phase"), table_name="grading_events")
    op.drop_index(op.f("ix_grading_events_submission_id"), table_name="grading_events")
    op.drop_table("grading_events")
