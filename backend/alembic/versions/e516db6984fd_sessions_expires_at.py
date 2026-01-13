"""sessions expires_at

Revision ID: e516db6984fd
Revises: 2b7e0b1c9f70
Create Date: 2026-01-13 16:58:13.409996

"""

from alembic import op
import sqlalchemy as sa


revision = 'e516db6984fd'
down_revision = '2b7e0b1c9f70'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("sessions", sa.Column("expires_at", sa.DateTime(timezone=True), nullable=True))
    # Backfill existing sessions with a conservative TTL (30 days) so we can enforce non-null.
    op.execute(
        sa.text(
            "UPDATE sessions SET expires_at = created_at + interval '30 days' WHERE expires_at IS NULL"
        )
    )
    op.alter_column("sessions", "expires_at", nullable=False)
    op.create_index(op.f("ix_sessions_expires_at"), "sessions", ["expires_at"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_sessions_expires_at"), table_name="sessions")
    op.drop_column("sessions", "expires_at")
