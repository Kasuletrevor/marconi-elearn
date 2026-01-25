"""github oauth state allow no org

Revision ID: 7da61f2bd243
Revises: 838b9832daba
Create Date: 2026-01-25 02:55:06.252683

"""

from alembic import op
import sqlalchemy as sa


revision = '7da61f2bd243'
down_revision = '838b9832daba'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.alter_column(
        "github_oauth_states",
        "organization_id",
        existing_type=sa.Integer(),
        nullable=True,
    )


def downgrade() -> None:
    op.alter_column(
        "github_oauth_states",
        "organization_id",
        existing_type=sa.Integer(),
        nullable=False,
    )
