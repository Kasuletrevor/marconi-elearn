"""resources_and_notifications

Revision ID: 6f1d9c8a7b0e
Revises: 9b2de2d9f6d1
Create Date: 2026-01-06 11:30:00.000000
"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = "6f1d9c8a7b0e"
down_revision = "9b2de2d9f6d1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE module_resource_kind AS ENUM ('link','file'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    )
    op.create_table(
        "module_resources",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("module_id", sa.Integer(), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM("link", "file", name="module_resource_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("url", sa.String(length=2000), nullable=True),
        sa.Column("file_name", sa.String(length=255), nullable=True),
        sa.Column("content_type", sa.String(length=100), nullable=True),
        sa.Column("size_bytes", sa.Integer(), nullable=True),
        sa.Column("storage_path", sa.String(length=500), nullable=True),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_published", sa.Boolean(), nullable=False, server_default=sa.text("false")),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["module_id"], ["modules.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_module_resources_kind"), "module_resources", ["kind"], unique=False)
    op.create_index(op.f("ix_module_resources_is_published"), "module_resources", ["is_published"], unique=False)
    op.create_index(op.f("ix_module_resources_module_id"), "module_resources", ["module_id"], unique=False)

    op.execute(
        "DO $$ BEGIN "
        "CREATE TYPE notification_kind AS ENUM ('submission_graded'); "
        "EXCEPTION WHEN duplicate_object THEN NULL; "
        "END $$;"
    )
    op.create_table(
        "notifications",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column(
            "kind",
            postgresql.ENUM("submission_graded", name="notification_kind", create_type=False),
            nullable=False,
        ),
        sa.Column("title", sa.String(length=200), nullable=False),
        sa.Column("body", sa.Text(), nullable=True),
        sa.Column("link_url", sa.String(length=500), nullable=True),
        sa.Column("read_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), nullable=False, server_default=sa.text("now()")),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_notifications_kind"), "notifications", ["kind"], unique=False)
    op.create_index(op.f("ix_notifications_user_id"), "notifications", ["user_id"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_notifications_user_id"), table_name="notifications")
    op.drop_index(op.f("ix_notifications_kind"), table_name="notifications")
    op.drop_table("notifications")
    op.execute("DROP TYPE notification_kind")

    op.drop_index(op.f("ix_module_resources_module_id"), table_name="module_resources")
    op.drop_index(op.f("ix_module_resources_is_published"), table_name="module_resources")
    op.drop_index(op.f("ix_module_resources_kind"), table_name="module_resources")
    op.drop_table("module_resources")
    op.execute("DROP TYPE module_resource_kind")
