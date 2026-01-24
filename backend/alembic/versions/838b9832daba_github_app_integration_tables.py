"""github app integration tables

Revision ID: 838b9832daba
Revises: 4136901bcd41
Create Date: 2026-01-25 02:07:25.269740

"""

from alembic import op
import sqlalchemy as sa


revision = '838b9832daba'
down_revision = '4136901bcd41'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("organizations", sa.Column("github_org_login", sa.String(length=100), nullable=True))
    op.create_index("ix_organizations_github_org_login", "organizations", ["github_org_login"], unique=False)

    op.create_table(
        "github_oauth_states",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("state", sa.String(length=128), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("state", name="uq_github_oauth_states_state"),
    )
    op.create_index("ix_github_oauth_states_expires_at", "github_oauth_states", ["expires_at"], unique=False)
    op.create_index(
        "ix_github_oauth_states_organization_id",
        "github_oauth_states",
        ["organization_id"],
        unique=False,
    )
    op.create_index("ix_github_oauth_states_state", "github_oauth_states", ["state"], unique=False)
    op.create_index("ix_github_oauth_states_user_id", "github_oauth_states", ["user_id"], unique=False)

    op.create_table(
        "org_github_admin_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("organization_id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("github_user_id", sa.Integer(), nullable=False),
        sa.Column("github_login", sa.String(length=200), nullable=False),
        sa.Column("access_token_enc", sa.String(length=4096), nullable=False),
        sa.Column("refresh_token_enc", sa.String(length=4096), nullable=False),
        sa.Column("token_expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("refresh_token_expires_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("last_verified_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("revoked_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["organization_id"], ["organizations.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("organization_id", "user_id", name="uq_org_github_admin_tokens_org_user"),
    )
    op.create_index(
        "ix_org_github_admin_tokens_github_user_id",
        "org_github_admin_tokens",
        ["github_user_id"],
        unique=False,
    )
    op.create_index(
        "ix_org_github_admin_tokens_organization_id",
        "org_github_admin_tokens",
        ["organization_id"],
        unique=False,
    )
    op.create_index(
        "ix_org_github_admin_tokens_token_expires_at",
        "org_github_admin_tokens",
        ["token_expires_at"],
        unique=False,
    )
    op.create_index(
        "ix_org_github_admin_tokens_user_id",
        "org_github_admin_tokens",
        ["user_id"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index("ix_org_github_admin_tokens_user_id", table_name="org_github_admin_tokens")
    op.drop_index("ix_org_github_admin_tokens_token_expires_at", table_name="org_github_admin_tokens")
    op.drop_index("ix_org_github_admin_tokens_organization_id", table_name="org_github_admin_tokens")
    op.drop_index("ix_org_github_admin_tokens_github_user_id", table_name="org_github_admin_tokens")
    op.drop_table("org_github_admin_tokens")

    op.drop_index("ix_github_oauth_states_user_id", table_name="github_oauth_states")
    op.drop_index("ix_github_oauth_states_state", table_name="github_oauth_states")
    op.drop_index("ix_github_oauth_states_organization_id", table_name="github_oauth_states")
    op.drop_index("ix_github_oauth_states_expires_at", table_name="github_oauth_states")
    op.drop_table("github_oauth_states")

    op.drop_index("ix_organizations_github_org_login", table_name="organizations")
    op.drop_column("organizations", "github_org_login")
