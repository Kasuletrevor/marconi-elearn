from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.course import Course
from app.models.course_membership import CourseMembership
from app.models.module import Module


async def list_my_courses(db: AsyncSession, *, user_id: int, offset: int = 0, limit: int = 100) -> list[Course]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(Course)
        .join(CourseMembership, CourseMembership.course_id == Course.id)
        .where(CourseMembership.user_id == user_id)
        .order_by(Course.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_course_modules(db: AsyncSession, *, course_id: int, offset: int = 0, limit: int = 100) -> list[Module]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.position, Module.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_course_assignments(
    db: AsyncSession, *, course_id: int, offset: int = 0, limit: int = 100
) -> list[Assignment]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(Assignment).where(Assignment.course_id == course_id).order_by(Assignment.id).offset(offset).limit(limit)
    )
    return list(result.scalars().all())

