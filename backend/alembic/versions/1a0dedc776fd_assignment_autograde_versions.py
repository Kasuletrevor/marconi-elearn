"""assignment autograde versions

Revision ID: 1a0dedc776fd
Revises: d21aa58899e1
Create Date: 2026-01-22 13:06:32.458663

"""

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


revision = '1a0dedc776fd'
down_revision = 'd21aa58899e1'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "assignment_autograde_versions",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "assignment_id",
            sa.Integer(),
            sa.ForeignKey("assignments.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("version", sa.Integer(), nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("created_by_user_id", sa.Integer(), sa.ForeignKey("users.id", ondelete="SET NULL"), nullable=True),
        sa.Column("grading_settings", postgresql.JSONB(astext_type=sa.Text()), nullable=False, server_default=sa.text("'{}'::jsonb")),
        sa.Column("note", sa.String(length=500), nullable=True),
        sa.UniqueConstraint("assignment_id", "version", name="uq_assignment_autograde_versions_assignment_id_version"),
    )
    op.create_index(
        "ix_assignment_autograde_versions_assignment_id",
        "assignment_autograde_versions",
        ["assignment_id"],
    )

    op.create_table(
        "assignment_autograde_test_cases",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column(
            "autograde_version_id",
            sa.Integer(),
            sa.ForeignKey("assignment_autograde_versions.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column(
            "test_case_id",
            sa.Integer(),
            sa.ForeignKey("test_cases.id", ondelete="CASCADE"),
            nullable=False,
        ),
        sa.Column("name", sa.String(length=200), nullable=False),
        sa.Column("position", sa.Integer(), nullable=False, server_default="1"),
        sa.Column("points", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("is_hidden", sa.Boolean(), nullable=False, server_default=sa.text("true")),
        sa.Column("stdin", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("expected_stdout", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("expected_stderr", sa.Text(), nullable=False, server_default=sa.text("''")),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index(
        "ix_assignment_autograde_test_cases_autograde_version_id",
        "assignment_autograde_test_cases",
        ["autograde_version_id"],
    )

    op.add_column(
        "assignments",
        sa.Column("autograde_mode", sa.String(length=20), nullable=False, server_default="practice_only"),
    )
    op.add_column(
        "assignments",
        sa.Column(
            "active_autograde_version_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.add_column(
        "assignments",
        sa.Column("final_autograde_enqueued_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.add_column(
        "assignments",
        sa.Column(
            "final_autograde_version_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_index("ix_assignments_active_autograde_version_id", "assignments", ["active_autograde_version_id"])
    op.create_index("ix_assignments_final_autograde_version_id", "assignments", ["final_autograde_version_id"])

    op.add_column(
        "submissions",
        sa.Column(
            "practice_autograde_version_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.add_column(
        "submissions",
        sa.Column(
            "final_autograde_version_id",
            sa.Integer(),
            nullable=True,
        ),
    )
    op.create_index("ix_submissions_practice_autograde_version_id", "submissions", ["practice_autograde_version_id"])
    op.create_index("ix_submissions_final_autograde_version_id", "submissions", ["final_autograde_version_id"])

    op.add_column(
        "submission_test_results",
        sa.Column("phase", sa.String(length=20), nullable=False, server_default="practice"),
    )
    op.create_index("ix_submission_test_results_submission_id_phase", "submission_test_results", ["submission_id", "phase"])

    # Backfill: create initial autograde version per assignment, snapshot existing test cases,
    # and attach existing submissions/results to practice phase.
    op.execute(
        """
        INSERT INTO assignment_autograde_versions (assignment_id, version, grading_settings, note)
        SELECT
          a.id,
          1,
          jsonb_build_object(
            'autograde_mode', 'practice_only',
            'max_points', a.max_points,
            'allows_zip', a.allows_zip,
            'expected_filename', a.expected_filename,
            'compile_command', a.compile_command,
            'due_date', CASE WHEN a.due_date IS NULL THEN NULL ELSE to_jsonb(a.due_date) END,
            'late_policy', a.late_policy
          ),
          'initial_migration'
        FROM assignments a
        WHERE NOT EXISTS (
          SELECT 1 FROM assignment_autograde_versions v WHERE v.assignment_id = a.id
        );
        """
    )
    op.execute(
        """
        UPDATE assignments a
        SET active_autograde_version_id = v.id
        FROM assignment_autograde_versions v
        WHERE v.assignment_id = a.id AND v.version = 1 AND a.active_autograde_version_id IS NULL;
        """
    )
    op.execute(
        """
        INSERT INTO assignment_autograde_test_cases (
          autograde_version_id, test_case_id, name, position, points, is_hidden, stdin, expected_stdout, expected_stderr
        )
        SELECT
          a.active_autograde_version_id,
          tc.id,
          tc.name,
          tc.position,
          tc.points,
          tc.is_hidden,
          tc.stdin,
          tc.expected_stdout,
          tc.expected_stderr
        FROM test_cases tc
        JOIN assignments a ON a.id = tc.assignment_id
        WHERE a.active_autograde_version_id IS NOT NULL;
        """
    )
    op.execute(
        """
        UPDATE submissions s
        SET practice_autograde_version_id = a.active_autograde_version_id
        FROM assignments a
        WHERE a.id = s.assignment_id AND s.practice_autograde_version_id IS NULL;
        """
    )
    op.execute("UPDATE submission_test_results SET phase = 'practice' WHERE phase IS NULL;")


def downgrade() -> None:
    op.drop_index("ix_submission_test_results_submission_id_phase", table_name="submission_test_results")
    op.drop_column("submission_test_results", "phase")

    op.drop_index("ix_submissions_final_autograde_version_id", table_name="submissions")
    op.drop_index("ix_submissions_practice_autograde_version_id", table_name="submissions")
    op.drop_column("submissions", "final_autograde_version_id")
    op.drop_column("submissions", "practice_autograde_version_id")

    op.drop_index("ix_assignments_final_autograde_version_id", table_name="assignments")
    op.drop_index("ix_assignments_active_autograde_version_id", table_name="assignments")
    op.drop_column("assignments", "final_autograde_version_id")
    op.drop_column("assignments", "final_autograde_enqueued_at")
    op.drop_column("assignments", "active_autograde_version_id")
    op.drop_column("assignments", "autograde_mode")

    op.drop_index("ix_assignment_autograde_test_cases_autograde_version_id", table_name="assignment_autograde_test_cases")
    op.drop_table("assignment_autograde_test_cases")

    op.drop_index("ix_assignment_autograde_versions_assignment_id", table_name="assignment_autograde_versions")
    op.drop_table("assignment_autograde_versions")
