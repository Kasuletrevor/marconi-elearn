from __future__ import annotations

from sqlalchemy import Select, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole


def _staff_courses_query(*, user_id: int) -> Select[tuple[Course]]:
    return (
        select(Course)
        .join(CourseMembership, CourseMembership.course_id == Course.id)
        .where(
            CourseMembership.user_id == user_id,
            CourseMembership.role.in_([CourseRole.owner, CourseRole.co_lecturer, CourseRole.ta]),
        )
        .order_by(Course.id.asc())
    )


async def list_staff_courses(db: AsyncSession, *, user_id: int, offset: int = 0, limit: int = 100) -> list[Course]:
    result = await db.execute(_staff_courses_query(user_id=user_id).offset(offset).limit(limit))
    return list(result.scalars().all())

