from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

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
    result = await db.execute(
        select(CourseMembership)
        .options(selectinload(CourseMembership.user))
        .where(CourseMembership.id == membership.id)
    )
    return result.scalars().one()


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
        .options(selectinload(CourseMembership.user))
        .where(CourseMembership.course_id == course_id)
        .order_by(CourseMembership.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_course_membership(db: AsyncSession, *, membership_id: int) -> CourseMembership | None:
    result = await db.execute(
        select(CourseMembership)
        .options(selectinload(CourseMembership.user))
        .where(CourseMembership.id == membership_id)
    )
    return result.scalars().first()


async def delete_course_membership(db: AsyncSession, *, membership: CourseMembership) -> None:
    await db.delete(membership)
    await db.commit()


async def update_course_membership(
    db: AsyncSession,
    *,
    membership: CourseMembership,
    role: CourseRole | None = None,
) -> CourseMembership:
    if role is not None:
        membership.role = role
    await db.commit()
    result = await db.execute(
        select(CourseMembership)
        .options(selectinload(CourseMembership.user))
        .where(CourseMembership.id == membership.id)
    )
    return result.scalars().one()
