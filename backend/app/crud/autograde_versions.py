from __future__ import annotations

from sqlalchemy import insert, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.assignment_autograde_test_case_snapshot import AssignmentAutogradeTestCaseSnapshot
from app.models.assignment_autograde_version import AssignmentAutogradeVersion
from app.models.test_case import TestCase


def _grading_settings_from_assignment(assignment: Assignment) -> dict:
    return {
        "autograde_mode": assignment.autograde_mode,
        "max_points": assignment.max_points,
        "allows_zip": bool(getattr(assignment, "allows_zip", False)),
        "expected_filename": getattr(assignment, "expected_filename", None),
        "compile_command": getattr(assignment, "compile_command", None),
        "due_date": assignment.due_date.isoformat() if assignment.due_date else None,
        "late_policy": assignment.late_policy,
    }


async def create_autograde_version_snapshot(
    db: AsyncSession,
    *,
    assignment: Assignment,
    created_by_user_id: int | None,
    note: str | None = None,
) -> AssignmentAutogradeVersion:
    # Locking rule: once final autograde has been enqueued, config is immutable.
    if assignment.final_autograde_enqueued_at is not None:
        raise ValueError("Assignment autograde config is locked")

    max_version_result = await db.execute(
        select(AssignmentAutogradeVersion.version)
        .where(AssignmentAutogradeVersion.assignment_id == assignment.id)
        .order_by(AssignmentAutogradeVersion.version.desc())
        .limit(1)
    )
    max_version = max_version_result.scalar_one_or_none()
    next_version = 1 if max_version is None else int(max_version) + 1

    version_row = AssignmentAutogradeVersion(
        assignment_id=assignment.id,
        version=next_version,
        created_by_user_id=created_by_user_id,
        grading_settings=_grading_settings_from_assignment(assignment),
        note=note,
    )
    db.add(version_row)
    await db.flush()

    # Mark as active on the assignment.
    assignment.active_autograde_version_id = version_row.id
    await db.flush()

    # Snapshot current test cases into the version table.
    stmt = insert(AssignmentAutogradeTestCaseSnapshot).from_select(
        [
            AssignmentAutogradeTestCaseSnapshot.autograde_version_id,
            AssignmentAutogradeTestCaseSnapshot.test_case_id,
            AssignmentAutogradeTestCaseSnapshot.name,
            AssignmentAutogradeTestCaseSnapshot.position,
            AssignmentAutogradeTestCaseSnapshot.points,
            AssignmentAutogradeTestCaseSnapshot.is_hidden,
            AssignmentAutogradeTestCaseSnapshot.stdin,
            AssignmentAutogradeTestCaseSnapshot.expected_stdout,
            AssignmentAutogradeTestCaseSnapshot.expected_stderr,
            AssignmentAutogradeTestCaseSnapshot.comparison_mode,
        ],
        select(
            version_row.id,
            TestCase.id,
            TestCase.name,
            TestCase.position,
            TestCase.points,
            TestCase.is_hidden,
            TestCase.stdin,
            TestCase.expected_stdout,
            TestCase.expected_stderr,
            TestCase.comparison_mode,
        ).where(TestCase.assignment_id == assignment.id),
    )
    await db.execute(stmt)
    return version_row


async def get_autograde_version(
    db: AsyncSession, *, autograde_version_id: int
) -> AssignmentAutogradeVersion | None:
    return await db.get(AssignmentAutogradeVersion, autograde_version_id)
