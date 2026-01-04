from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.org_memberships import (
    OrgMembershipExistsError,
    add_membership,
    delete_membership,
    get_membership,
    list_memberships,
    update_membership,
)
from app.db.deps import get_db
from app.models.user import User
from app.schemas.org_membership import OrgMembershipCreate, OrgMembershipOut, OrgMembershipUpdate

router = APIRouter(prefix="/orgs/{org_id}/memberships")


@router.post("", response_model=OrgMembershipOut, status_code=status.HTTP_201_CREATED)
async def add_member(
    org_id: int,
    payload: OrgMembershipCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> OrgMembershipOut:
    try:
        return await add_membership(db, organization_id=org_id, user_id=payload.user_id, role=payload.role)
    except OrgMembershipExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already in organization") from exc


@router.get("", response_model=list[OrgMembershipOut])
async def list_members(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
    offset: int = 0,
    limit: int = 100,
) -> list[OrgMembershipOut]:
    return await list_memberships(db, organization_id=org_id, offset=offset, limit=limit)


@router.patch("/{membership_id}", response_model=OrgMembershipOut)
async def update_member(
    org_id: int,
    membership_id: int,
    payload: OrgMembershipUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> OrgMembershipOut:
    membership = await get_membership(db, membership_id=membership_id)
    if membership is None or membership.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    return await update_membership(db, membership=membership, role=payload.role)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_member(
    org_id: int,
    membership_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> None:
    membership = await get_membership(db, membership_id=membership_id)
    if membership is None or membership.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")

    await delete_membership(db, membership=membership)
    return None
