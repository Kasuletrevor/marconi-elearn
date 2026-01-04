from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_membership import CourseMembership, CourseRole


class CourseMembershipExistsError(Exception):
    pass


async def add_course_membership(
    db: AsyncSession,
    *,
    course_id: int,
    user_id: int,
    role: CourseRole,
) -> CourseMembership:
    membership = CourseMembership(course_id=course_id, user_id=user_id, role=role)
    db.add(membership)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise CourseMembershipExistsError from exc
    await db.refresh(membership)
    return membership


async def list_course_memberships(
    db: AsyncSession,
    *,
    course_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[CourseMembership]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(CourseMembership)
        .where(CourseMembership.course_id == course_id)
        .order_by(CourseMembership.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_course_membership(db: AsyncSession, *, membership_id: int) -> CourseMembership | None:
    return await db.get(CourseMembership, membership_id)


async def delete_course_membership(db: AsyncSession, *, membership: CourseMembership) -> None:
    await db.delete(membership)
    await db.commit()

