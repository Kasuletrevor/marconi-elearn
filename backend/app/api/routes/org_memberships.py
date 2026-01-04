from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.models.organization_membership import OrganizationMembership
from app.schemas.org_membership import OrgMembershipCreate, OrgMembershipOut, OrgMembershipUpdate

router = APIRouter(prefix="/orgs/{org_id}/memberships")


@router.post("", response_model=OrgMembershipOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    org_id: int,
    payload: OrgMembershipCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationMembership:
    membership = OrganizationMembership(organization_id=org_id, user_id=payload.user_id, role=payload.role)
    db.add(membership)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already in organization") from exc
    await db.refresh(membership)
    return membership


@router.get("", response_model=list[OrgMembershipOut])
async def list_members(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[OrganizationMembership]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(OrganizationMembership)
        .where(OrganizationMembership.organization_id == org_id)
        .order_by(OrganizationMembership.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


@router.patch("/{membership_id}", response_model=OrgMembershipOut)
async def update_member(
    org_id: int,
    membership_id: int,
    payload: OrgMembershipUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> OrganizationMembership:
    membership = await db.get(OrganizationMembership, membership_id)
    if membership is None or membership.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    if payload.role is not None:
        membership.role = payload.role

    await db.commit()
    await db.refresh(membership)
    return membership


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: int,
    membership_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    membership = await db.get(OrganizationMembership, membership_id)
    if membership is None or membership.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    await db.delete(membership)
    await db.commit()
    return None

