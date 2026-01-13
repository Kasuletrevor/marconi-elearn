import logging
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.api.deps.superadmin import require_superadmin
from app.crud.audit import create_audit_event
from app.crud.organizations import (
    OrgNameTakenError,
    create_organization,
    delete_organization,
    get_organization,
    list_admin_organizations,
    update_organization,
)
from app.db.deps import get_db
from app.models.user import User
from app.schemas.organization import OrganizationCreate, OrganizationOut, OrganizationUpdate

router = APIRouter(prefix="/orgs")
logger = logging.getLogger(__name__)


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_org(
    payload: OrganizationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(require_superadmin)],
) -> OrganizationOut:
    try:
        org = await create_organization(db, name=payload.name)
        try:
            await create_audit_event(
                db,
                organization_id=org.id,
                actor_user_id=current_user.id,
                action="org.created",
                target_type="organization",
                target_id=org.id,
                metadata={"name": org.name},
            )
        except Exception:
            logger.exception("Failed to write audit event org.created")
        return org
    except OrgNameTakenError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        ) from exc


@router.get("", response_model=list[OrganizationOut])
async def list_orgs(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[OrganizationOut]:
    return await list_admin_organizations(db, user_id=current_user.id, offset=offset, limit=limit)


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_org(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> OrganizationOut:
    org = await get_organization(db, org_id=org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.patch("/{org_id}", response_model=OrganizationOut)
async def update_org(
    org_id: int,
    payload: OrganizationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> OrganizationOut:
    org = await get_organization(db, org_id=org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    try:
        return await update_organization(db, org=org, name=payload.name)
    except OrgNameTakenError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        ) from exc


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> None:
    org = await get_organization(db, org_id=org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    try:
        await create_audit_event(
            db,
            organization_id=org.id,
            actor_user_id=_current_user.id,
            action="org.deleted",
            target_type="organization",
            target_id=org.id,
            metadata={"name": org.name},
        )
    except Exception:
        logger.exception("Failed to write audit event org.deleted")

    await delete_organization(db, org=org)
    return None
