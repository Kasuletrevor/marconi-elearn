from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin, require_org_member
from app.crud.audit import enqueue_audit_event
from app.crud.invites import create_org_member_invite
from app.crud.org_memberships import (
    OrgMembershipExistsError,
    add_membership,
    count_admin_memberships,
    delete_membership,
    get_membership,
    list_memberships,
    update_membership,
)
from app.crud.users import get_user_by_email, create_pending_user
from app.db.deps import get_db
from app.models.organization_membership import OrgRole
from app.models.user import User
from app.schemas.org_membership import (
    OrgMembershipCreate,
    OrgMembershipCreateByEmail,
    OrgMembershipInviteOut,
    OrgMembershipOut,
    OrgMembershipUpdate,
)

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
        membership = await add_membership(
            db, organization_id=org_id, user_id=payload.user_id, role=payload.role
        )
        enqueue_audit_event(
            organization_id=org_id,
            actor_user_id=_current_user.id,
            action="org_membership.added",
            target_type="user",
            target_id=membership.user_id,
            metadata={"role": membership.role},
            context={"org_id": org_id, "target_user_id": membership.user_id},
        )
        return membership
    except OrgMembershipExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already in organization") from exc


@router.post("/by-email", response_model=OrgMembershipInviteOut, status_code=status.HTTP_201_CREATED)
async def add_member_by_email(
    org_id: int,
    payload: OrgMembershipCreateByEmail,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> OrgMembershipInviteOut:
    email = str(payload.email).strip().lower()
    user = await get_user_by_email(db, email=email)
    if user is None:
        user = await create_pending_user(db, email=email)

    try:
        membership = await add_membership(db, organization_id=org_id, user_id=user.id, role=payload.role)
    except OrgMembershipExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already in organization") from exc

    invite_link: str | None = None
    if user.password_hash is None:
        token = await create_org_member_invite(db, organization_id=org_id, email=email, expires_in_days=7)
        invite_link = f"/invite/{token}"

    enqueue_audit_event(
        organization_id=org_id,
        actor_user_id=_current_user.id,
        action="org_membership.invited",
        target_type="user",
        target_id=membership.user_id,
        metadata={"email": email, "role": membership.role, "invite": bool(invite_link)},
        context={"org_id": org_id, "target_user_id": membership.user_id},
    )

    return OrgMembershipInviteOut(
        id=membership.id,
        organization_id=membership.organization_id,
        user_id=membership.user_id,
        user_email=membership.user_email,
        role=membership.role,
        invite_link=invite_link,
    )


@router.get("", response_model=list[OrgMembershipOut])
async def list_members(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_member: Annotated[None, Depends(require_org_member)],
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
    if membership.user_id == _current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot change your own organization role",
        )
    if payload.role is not None and membership.role == OrgRole.admin and payload.role != OrgRole.admin:
        admin_count = await count_admin_memberships(
            db,
            organization_id=org_id,
            exclude_membership_id=membership.id,
        )
        if admin_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization must have at least one admin",
            )

    updated = await update_membership(db, membership=membership, role=payload.role)
    enqueue_audit_event(
        organization_id=org_id,
        actor_user_id=_current_user.id,
        action="org_membership.updated",
        target_type="user",
        target_id=updated.user_id,
        metadata={"role": updated.role},
        context={"org_id": org_id, "target_user_id": updated.user_id},
    )
    return updated


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
    if membership.user_id == _current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot remove your own membership",
        )
    if membership.role == OrgRole.admin:
        admin_count = await count_admin_memberships(
            db,
            organization_id=org_id,
            exclude_membership_id=membership.id,
        )
        if admin_count == 0:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Organization must have at least one admin",
            )

    await delete_membership(db, membership=membership)
    enqueue_audit_event(
        organization_id=org_id,
        actor_user_id=_current_user.id,
        action="org_membership.removed",
        target_type="user",
        target_id=membership.user_id,
        metadata={"role": membership.role},
        context={"org_id": org_id, "target_user_id": membership.user_id},
    )
    return None
