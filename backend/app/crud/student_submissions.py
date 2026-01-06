from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.course import Course
from app.models.submission import Submission


@dataclass(frozen=True)
class StudentSubmissionRow:
    submission: Submission
    assignment: Assignment
    course: Course


def _student_submissions_query(*, user_id: int) -> Select[tuple]:
    return (
        select(Submission, Assignment, Course)
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .join(Course, Course.id == Assignment.course_id)
        .where(Submission.user_id == user_id)
        .order_by(Submission.id.desc())
    )


async def list_student_submission_rows(
    db: AsyncSession,
    *,
    user_id: int,
    course_id: int | None = None,
    assignment_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[StudentSubmissionRow]:
    offset = max(0, offset)
    limit = min(max(1, limit), 200)
    stmt = _student_submissions_query(user_id=user_id)
    if course_id is not None:
        stmt = stmt.where(Course.id == course_id)
    if assignment_id is not None:
        stmt = stmt.where(Assignment.id == assignment_id)
    result = await db.execute(stmt.offset(offset).limit(limit))
    rows: list[StudentSubmissionRow] = []
    for submission, assignment, course in result.all():
        rows.append(StudentSubmissionRow(submission=submission, assignment=assignment, course=course))
    return rows


async def get_student_submission_row(
    db: AsyncSession, *, user_id: int, submission_id: int
) -> StudentSubmissionRow | None:
    result = await db.execute(_student_submissions_query(user_id=user_id).where(Submission.id == submission_id).limit(1))
    row = result.first()
    if row is None:
        return None
    submission, assignment, course = row
    return StudentSubmissionRow(submission=submission, assignment=assignment, course=course)

