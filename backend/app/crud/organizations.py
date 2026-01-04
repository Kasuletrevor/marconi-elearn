from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.organization import Organization
from app.models.organization_membership import OrgRole, OrganizationMembership


class OrgNameTakenError(Exception):
    pass


async def create_organization(db: AsyncSession, *, name: str) -> Organization:
    org = Organization(name=name.strip())
    db.add(org)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise OrgNameTakenError from exc
    await db.refresh(org)
    return org


async def list_organizations(db: AsyncSession, *, offset: int = 0, limit: int = 100) -> list[Organization]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(select(Organization).order_by(Organization.id).offset(offset).limit(limit))
    return list(result.scalars().all())


async def list_admin_organizations(
    db: AsyncSession,
    *,
    user_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[Organization]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(Organization)
        .join(OrganizationMembership, OrganizationMembership.organization_id == Organization.id)
        .where(OrganizationMembership.user_id == user_id, OrganizationMembership.role == OrgRole.admin)
        .order_by(Organization.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_organization(db: AsyncSession, *, org_id: int) -> Organization | None:
    return await db.get(Organization, org_id)


async def update_organization(db: AsyncSession, *, org: Organization, name: str | None) -> Organization:
    if name is not None:
        org.name = name.strip()
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise OrgNameTakenError from exc
    await db.refresh(org)
    return org


async def delete_organization(db: AsyncSession, *, org: Organization) -> None:
    await db.delete(org)
    await db.commit()
