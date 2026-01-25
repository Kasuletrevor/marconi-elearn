"""course github claims

Revision ID: 7e1bc1d9516c
Revises: f017d561a45b
Create Date: 2026-01-25 03:07:47.208268

"""

from alembic import op
import sqlalchemy as sa


revision = '7e1bc1d9516c'
down_revision = 'f017d561a45b'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("course_memberships", sa.Column("github_user_id", sa.Integer(), nullable=True))
    op.add_column("course_memberships", sa.Column("github_login", sa.String(length=200), nullable=True))
    op.add_column("course_memberships", sa.Column("github_linked_at", sa.DateTime(timezone=True), nullable=True))
    op.add_column("course_memberships", sa.Column("github_linked_by_user_id", sa.Integer(), nullable=True))
    op.create_index(
        "uq_course_github_user_id",
        "course_memberships",
        ["course_id", "github_user_id"],
        unique=True,
        postgresql_where=sa.text("github_user_id IS NOT NULL"),
    )
    op.create_foreign_key(
        "fk_course_memberships_github_linked_by_user_id",
        "course_memberships",
        "users",
        ["github_linked_by_user_id"],
        ["id"],
        ondelete="SET NULL",
    )

    op.create_table(
        "course_github_claims",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("course_membership_id", sa.Integer(), nullable=False),
        sa.Column("github_user_id", sa.Integer(), nullable=False),
        sa.Column("github_login", sa.String(length=200), nullable=False),
        sa.Column(
            "status",
            sa.Enum("pending", "approved", "rejected", name="github_claim_status"),
            server_default="pending",
            nullable=False,
        ),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("reviewed_by_user_id", sa.Integer(), nullable=True),
        sa.Column("reviewed_at", sa.DateTime(timezone=True), nullable=True),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["course_membership_id"], ["course_memberships.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["reviewed_by_user_id"], ["users.id"], ondelete="SET NULL"),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("course_membership_id", name="uq_course_github_claim_membership"),
        sa.UniqueConstraint("course_id", "github_user_id", name="uq_course_github_claim_course_github_user"),
    )
    op.create_index("ix_course_github_claims_course_id", "course_github_claims", ["course_id"], unique=False)
    op.create_index(
        "ix_course_github_claims_course_membership_id",
        "course_github_claims",
        ["course_membership_id"],
        unique=False,
    )
    op.create_index("ix_course_github_claims_github_user_id", "course_github_claims", ["github_user_id"], unique=False)
    op.create_index("ix_course_github_claims_status", "course_github_claims", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_course_github_claims_status", table_name="course_github_claims")
    op.drop_index("ix_course_github_claims_github_user_id", table_name="course_github_claims")
    op.drop_index("ix_course_github_claims_course_membership_id", table_name="course_github_claims")
    op.drop_index("ix_course_github_claims_course_id", table_name="course_github_claims")
    op.drop_table("course_github_claims")
    op.execute("DROP TYPE IF EXISTS github_claim_status")

    op.drop_constraint("fk_course_memberships_github_linked_by_user_id", "course_memberships", type_="foreignkey")
    op.drop_index("uq_course_github_user_id", table_name="course_memberships")
    op.drop_column("course_memberships", "github_linked_by_user_id")
    op.drop_column("course_memberships", "github_linked_at")
    op.drop_column("course_memberships", "github_login")
    op.drop_column("course_memberships", "github_user_id")
