from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole
from app.models.student_profile import StudentProfile
from app.models.user import User


class SelfEnrollInvalidCodeError(Exception):
    pass


class SelfEnrollAlreadyEnrolledError(Exception):
    pass


class SelfEnrollStudentNumberTakenError(Exception):
    pass


class SelfEnrollFailedError(Exception):
    pass


async def enroll_student_via_self_enroll_code(
    db: AsyncSession,
    *,
    user: User,
    code: str,
    full_name: str,
    student_number: str,
    programme: str,
) -> Course:
    normalized_code = code.strip().upper()
    result = await db.execute(
        select(Course).where(
            Course.self_enroll_enabled.is_(True),
            Course.self_enroll_code == normalized_code,
        )
    )
    course = result.scalars().first()
    if course is None:
        raise SelfEnrollInvalidCodeError

    existing = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course.id,
            CourseMembership.user_id == user.id,
        )
    )
    if existing.scalars().first() is not None:
        raise SelfEnrollAlreadyEnrolledError

    profile = await db.get(StudentProfile, user.id)
    if profile is None:
        profile = StudentProfile(
            user_id=user.id,
            full_name=full_name.strip(),
            programme=programme.strip(),
        )
        db.add(profile)
    else:
        profile.full_name = full_name.strip()
        profile.programme = programme.strip()

    db.add(
        CourseMembership(
            course_id=course.id,
            user_id=user.id,
            role=CourseRole.student,
            student_number=student_number.strip(),
        )
    )

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()

        existing = await db.execute(
            select(CourseMembership).where(
                CourseMembership.course_id == course.id,
                CourseMembership.user_id == user.id,
            )
        )
        if existing.scalars().first() is not None:
            raise SelfEnrollAlreadyEnrolledError from exc

        number_taken = await db.execute(
            select(CourseMembership.id).where(
                CourseMembership.course_id == course.id,
                CourseMembership.student_number == student_number.strip(),
            )
        )
        if number_taken.scalar_one_or_none() is not None:
            raise SelfEnrollStudentNumberTakenError from exc

        raise SelfEnrollFailedError from exc

    await db.refresh(course)
    return course

