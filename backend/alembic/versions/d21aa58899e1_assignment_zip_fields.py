"""assignment zip fields

Revision ID: d21aa58899e1
Revises: c2b838fcce02
Create Date: 2026-01-18 06:56:57.238143

"""

from alembic import op
import sqlalchemy as sa


revision = 'd21aa58899e1'
down_revision = 'c2b838fcce02'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "assignments",
        sa.Column("allows_zip", sa.Boolean(), nullable=False, server_default=sa.text("false")),
    )
    op.add_column("assignments", sa.Column("expected_filename", sa.String(length=255), nullable=True))
    op.add_column("assignments", sa.Column("compile_command", sa.String(length=500), nullable=True))


def downgrade() -> None:
    op.drop_column("assignments", "compile_command")
    op.drop_column("assignments", "expected_filename")
    op.drop_column("assignments", "allows_zip")
