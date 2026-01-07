from __future__ import annotations

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.course_membership import CourseMembership, CourseRole
from app.models.student_profile import StudentProfile
from app.models.submission import Submission
from app.models.user import User


async def count_students_in_course(db: AsyncSession, *, course_id: int) -> int:
    stmt = select(func.count(CourseMembership.id)).where(
        and_(CourseMembership.course_id == course_id, CourseMembership.role == CourseRole.student)
    )
    result = await db.execute(stmt)
    return int(result.scalar_one())


async def list_missing_submissions_summary(
    db: AsyncSession,
    *,
    course_id: int,
) -> list[tuple[int, str, int, int, int]]:
    student_membership = CourseMembership
    total_students_subq = (
        select(func.count(student_membership.id))
        .where(and_(student_membership.course_id == course_id, student_membership.role == CourseRole.student))
        .scalar_subquery()
    )

    submitted_count = func.count(func.distinct(student_membership.user_id))

    stmt = (
        select(
            Assignment.id,
            Assignment.title,
            total_students_subq.label("total_students"),
            submitted_count.label("submitted_count"),
        )
        .where(Assignment.course_id == course_id)
        .outerjoin(Submission, Submission.assignment_id == Assignment.id)
        .outerjoin(
            student_membership,
            and_(
                student_membership.course_id == course_id,
                student_membership.role == CourseRole.student,
                student_membership.user_id == Submission.user_id,
            ),
        )
        .group_by(Assignment.id, Assignment.title)
        .order_by(Assignment.id.asc())
    )
    result = await db.execute(stmt)
    rows: list[tuple[int, str, int, int, int]] = []
    for assignment_id, title, total_students, submitted in result.all():
        total_students_int = int(total_students)
        submitted_int = int(submitted)
        missing = max(0, total_students_int - submitted_int)
        rows.append((assignment_id, title, total_students_int, submitted_int, missing))
    return rows


async def list_missing_students_for_assignment(
    db: AsyncSession,
    *,
    course_id: int,
    assignment_id: int,
) -> list[tuple[User, StudentProfile | None, str | None]]:
    student_membership = CourseMembership
    stmt = (
        select(User, StudentProfile, student_membership.student_number)
        .join(
            student_membership,
            and_(
                student_membership.user_id == User.id,
                student_membership.course_id == course_id,
                student_membership.role == CourseRole.student,
            ),
        )
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .outerjoin(
            Submission,
            and_(Submission.assignment_id == assignment_id, Submission.user_id == User.id),
        )
        .where(Submission.id.is_(None))
        .order_by(StudentProfile.full_name.asc().nullslast(), User.email.asc())
    )
    result = await db.execute(stmt)
    return list(result.all())
