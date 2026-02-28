"""password_reset_tokens and plagiarism tables

Revision ID: a8e3f7b2c1d4
Revises: f1a2d3c4b5e6
Create Date: 2026-02-28 00:00:00.000000

"""

from alembic import op
import sqlalchemy as sa

# revision identifiers, used by Alembic.
revision = "a8e3f7b2c1d4"
down_revision = "f1a2d3c4b5e6"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # -- Add new notification kind --
    op.execute("ALTER TYPE notification_kind ADD VALUE IF NOT EXISTS 'assignment_due_reminder'")

    # -- password_reset_tokens --
    op.create_table(
        "password_reset_tokens",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("user_id", sa.Integer(), nullable=False),
        sa.Column("token_hash", sa.String(64), nullable=False),
        sa.Column("expires_at", sa.DateTime(timezone=True), nullable=False),
        sa.Column("used_at", sa.DateTime(timezone=True), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_password_reset_tokens_user_id", "password_reset_tokens", ["user_id"])
    op.create_index(
        "ix_password_reset_tokens_token_hash",
        "password_reset_tokens",
        ["token_hash"],
        unique=True,
    )

    # -- plagiarism_runs --
    op.create_table(
        "plagiarism_runs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("course_id", sa.Integer(), nullable=False),
        sa.Column("assignment_id", sa.Integer(), nullable=False),
        sa.Column("initiated_by_user_id", sa.Integer(), nullable=False),
        sa.Column(
            "status",
            sa.String(20),
            nullable=False,
            server_default="pending",
        ),
        sa.Column("moss_report_url", sa.String(500), nullable=True),
        sa.Column("error_message", sa.Text(), nullable=True),
        sa.Column("pair_count", sa.Integer(), nullable=True),
        sa.Column(
            "created_at",
            sa.DateTime(timezone=True),
            server_default=sa.func.now(),
            nullable=False,
        ),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["course_id"], ["courses.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["assignment_id"], ["assignments.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["initiated_by_user_id"], ["users.id"], ondelete="CASCADE"),
    )
    op.create_index("ix_plagiarism_runs_assignment_id", "plagiarism_runs", ["assignment_id"])
    op.create_index("ix_plagiarism_runs_course_id", "plagiarism_runs", ["course_id"])

    # -- plagiarism_pairs --
    op.create_table(
        "plagiarism_pairs",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("run_id", sa.Integer(), nullable=False),
        sa.Column("student_a_user_id", sa.Integer(), nullable=False),
        sa.Column("student_b_user_id", sa.Integer(), nullable=False),
        sa.Column("submission_a_id", sa.Integer(), nullable=True),
        sa.Column("submission_b_id", sa.Integer(), nullable=True),
        sa.Column("similarity_pct", sa.Integer(), nullable=False),
        sa.Column("lines_matched", sa.Integer(), nullable=True),
        sa.Column("moss_match_url", sa.String(500), nullable=True),
        sa.PrimaryKeyConstraint("id"),
        sa.ForeignKeyConstraint(["run_id"], ["plagiarism_runs.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_a_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["student_b_user_id"], ["users.id"], ondelete="CASCADE"),
        sa.ForeignKeyConstraint(["submission_a_id"], ["submissions.id"], ondelete="SET NULL"),
        sa.ForeignKeyConstraint(["submission_b_id"], ["submissions.id"], ondelete="SET NULL"),
    )
    op.create_index("ix_plagiarism_pairs_run_id", "plagiarism_pairs", ["run_id"])


def downgrade() -> None:
    op.drop_table("plagiarism_pairs")
    op.drop_table("plagiarism_runs")
    op.drop_table("password_reset_tokens")
