"""user github identity

Revision ID: f017d561a45b
Revises: 7da61f2bd243
Create Date: 2026-01-25 02:56:32.108898

"""

from alembic import op
import sqlalchemy as sa


revision = 'f017d561a45b'
down_revision = '7da61f2bd243'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("users", sa.Column("github_user_id", sa.Integer(), nullable=True))
    op.add_column("users", sa.Column("github_login", sa.String(length=200), nullable=True))
    op.add_column("users", sa.Column("github_connected_at", sa.DateTime(timezone=True), nullable=True))
    op.create_index("ix_users_github_user_id", "users", ["github_user_id"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_users_github_user_id", table_name="users")
    op.drop_column("users", "github_connected_at")
    op.drop_column("users", "github_login")
    op.drop_column("users", "github_user_id")
