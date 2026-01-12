"""course_notification_prefs_and_staff_digest_kind

Revision ID: 2b7e0b1c9f70
Revises: 8c1b0e6b1a2d
Create Date: 2026-01-12 00:00:00.000000
"""

from alembic import op
import sqlalchemy as sa


revision = "2b7e0b1c9f70"
down_revision = "8c1b0e6b1a2d"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'submissions_received'; "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    )

    op.create_table(
        "course_notification_preferences",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "notify_new_submissions",
            sa.Boolean(),
            nullable=False,
            server_default=sa.text("true"),
        ),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            nullable=False,
            server_default=sa.text("now()"),
        ),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_id", "user_id", name="uq_course_notification_preference"),
    )
    op.create_index(
        "ix_course_notification_preferences_course_user",
        "course_notification_preferences",
        ["course_id", "user_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_course_notification_preferences_course_id"),
        "course_notification_preferences",
        ["course_id"],
        unique=False,
    )
    op.create_index(
        op.f("ix_course_notification_preferences_user_id"),
        "course_notification_preferences",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    # NOTE: enum values cannot be removed safely in Postgres.
    op.drop_index(op.f("ix_course_notification_preferences_user_id"), table_name="course_notification_preferences")
    op.drop_index(op.f("ix_course_notification_preferences_course_id"), table_name="course_notification_preferences")
    op.drop_index(
        "ix_course_notification_preferences_course_user",
        table_name="course_notification_preferences",
    )
    op.drop_table("course_notification_preferences")

