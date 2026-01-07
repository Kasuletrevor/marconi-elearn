from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.organization_membership import OrgRole, OrganizationMembership


class OrgMembershipExistsError(Exception):
    pass


async def add_membership(
    db: AsyncSession,
    *,
    organization_id: int,
    user_id: int,
    role: OrgRole,
) -> OrganizationMembership:
    membership = OrganizationMembership(organization_id=organization_id, user_id=user_id, role=role)
    db.add(membership)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise OrgMembershipExistsError from exc
    result = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.user))
        .where(OrganizationMembership.id == membership.id)
    )
    return result.scalars().one()


async def list_memberships(
    db: AsyncSession,
    *,
    organization_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[OrganizationMembership]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.user))
        .where(OrganizationMembership.organization_id == organization_id)
        .order_by(OrganizationMembership.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_membership(db: AsyncSession, *, membership_id: int) -> OrganizationMembership | None:
    result = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.user))
        .where(OrganizationMembership.id == membership_id)
    )
    return result.scalars().first()


async def update_membership(
    db: AsyncSession,
    *,
    membership: OrganizationMembership,
    role: OrgRole | None,
) -> OrganizationMembership:
    if role is not None:
        membership.role = role
    await db.commit()
    result = await db.execute(
        select(OrganizationMembership)
        .options(selectinload(OrganizationMembership.user))
        .where(OrganizationMembership.id == membership.id)
    )
    return result.scalars().one()


async def delete_membership(db: AsyncSession, *, membership: OrganizationMembership) -> None:
    await db.delete(membership)
    await db.commit()
