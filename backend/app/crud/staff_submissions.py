from __future__ import annotations

from dataclasses import dataclass

from sqlalchemy import Select, and_, case, func, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import aliased

from app.models.assignment import Assignment
from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole
from app.models.student_profile import StudentProfile
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User


@dataclass(frozen=True)
class StaffSubmissionRow:
    submission: Submission
    assignment: Assignment
    course: Course
    student: User
    student_profile: StudentProfile | None
    student_number: str | None


def _base_staff_submission_query(*, staff_user_id: int) -> Select[tuple]:
    StaffMembership = aliased(CourseMembership)
    StudentMembership = aliased(CourseMembership)

    return (
        select(
            Submission,
            Assignment,
            Course,
            User,
            StudentProfile,
            StudentMembership.student_number,
        )
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .join(Course, Course.id == Assignment.course_id)
        .join(
            StaffMembership,
            and_(
                StaffMembership.course_id == Course.id,
                StaffMembership.user_id == staff_user_id,
                StaffMembership.role.in_([CourseRole.owner, CourseRole.co_lecturer, CourseRole.ta]),
            ),
        )
        .join(User, User.id == Submission.user_id)
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .outerjoin(
            StudentMembership,
            and_(StudentMembership.course_id == Course.id, StudentMembership.user_id == User.id),
        )
    )


async def list_staff_submission_rows(
    db: AsyncSession,
    *,
    staff_user_id: int,
    course_id: int | None = None,
    status: SubmissionStatus | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[StaffSubmissionRow]:
    offset = max(0, offset)
    limit = min(max(1, limit), 200)
    stmt = _base_staff_submission_query(staff_user_id=staff_user_id).order_by(Submission.id.desc())
    if course_id is not None:
        stmt = stmt.where(Course.id == course_id)
    if status is not None:
        stmt = stmt.where(Submission.status == status)
    result = await db.execute(stmt.offset(offset).limit(limit))
    rows: list[StaffSubmissionRow] = []
    for submission, assignment, course, student, profile, student_number in result.all():
        rows.append(
            StaffSubmissionRow(
                submission=submission,
                assignment=assignment,
                course=course,
                student=student,
                student_profile=profile,
                student_number=student_number,
            )
        )
    return rows


async def count_staff_submission_rows(
    db: AsyncSession,
    *,
    staff_user_id: int,
    course_id: int | None = None,
    status: SubmissionStatus | None = None,
) -> int:
    stmt = _base_staff_submission_query(staff_user_id=staff_user_id)
    if course_id is not None:
        stmt = stmt.where(Course.id == course_id)
    if status is not None:
        stmt = stmt.where(Submission.status == status)
    count_stmt = stmt.with_only_columns(func.count(Submission.id)).order_by(None)
    result = await db.execute(count_stmt)
    return int(result.scalar_one())


async def list_staff_submission_rows_by_ids(
    db: AsyncSession,
    *,
    staff_user_id: int,
    submission_ids: list[int],
) -> list[StaffSubmissionRow]:
    if not submission_ids:
        return []
    stmt = _base_staff_submission_query(staff_user_id=staff_user_id).where(
        Submission.id.in_(submission_ids)
    )
    result = await db.execute(stmt)
    rows: list[StaffSubmissionRow] = []
    for submission, assignment, course, student, profile, student_number in result.all():
        rows.append(
            StaffSubmissionRow(
                submission=submission,
                assignment=assignment,
                course=course,
                student=student,
                student_profile=profile,
                student_number=student_number,
            )
        )
    return rows


async def get_next_ungraded_staff_submission_row(
    db: AsyncSession,
    *,
    staff_user_id: int,
    course_id: int | None = None,
    status: SubmissionStatus | None = None,
) -> StaffSubmissionRow | None:
    stmt = _base_staff_submission_query(staff_user_id=staff_user_id)
    if course_id is not None:
        stmt = stmt.where(Course.id == course_id)
    if status is not None:
        stmt = stmt.where(Submission.status == status)
    else:
        stmt = stmt.where(Submission.status != SubmissionStatus.graded)

    priority = case(
        (Submission.status == SubmissionStatus.pending, 0),
        (Submission.status == SubmissionStatus.grading, 1),
        (Submission.status == SubmissionStatus.error, 2),
        else_=3,
    )
    stmt = stmt.order_by(priority, Submission.created_at.asc(), Submission.id.asc())
    result = await db.execute(stmt.limit(1))
    row = result.first()
    if row is None:
        return None
    submission, assignment, course, student, profile, student_number = row
    return StaffSubmissionRow(
        submission=submission,
        assignment=assignment,
        course=course,
        student=student,
        student_profile=profile,
        student_number=student_number,
    )


async def get_staff_submission_row(
    db: AsyncSession, *, staff_user_id: int, submission_id: int
) -> StaffSubmissionRow | None:
    stmt = _base_staff_submission_query(staff_user_id=staff_user_id).where(Submission.id == submission_id)
    result = await db.execute(stmt.limit(1))
    row = result.first()
    if row is None:
        return None
    submission, assignment, course, student, profile, student_number = row
    return StaffSubmissionRow(
        submission=submission,
        assignment=assignment,
        course=course,
        student=student,
        student_profile=profile,
        student_number=student_number,
    )
