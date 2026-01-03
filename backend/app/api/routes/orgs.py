from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.models.organization import Organization
from app.schemas.organization import OrganizationCreate, OrganizationOut, OrganizationUpdate

router = APIRouter(prefix="/orgs")


@router.post("", response_model=OrganizationOut, status_code=status.HTTP_201_CREATED)
async def create_org(
    payload: OrganizationCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Organization:
    org = Organization(name=payload.name.strip())
    db.add(org)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        ) from exc
    await db.refresh(org)
    return org


@router.get("", response_model=list[OrganizationOut])
async def list_orgs(
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[Organization]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(select(Organization).order_by(Organization.id).offset(offset).limit(limit))
    return list(result.scalars().all())


@router.get("/{org_id}", response_model=OrganizationOut)
async def get_org(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Organization:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    return org


@router.patch("/{org_id}", response_model=OrganizationOut)
async def update_org(
    org_id: int,
    payload: OrganizationUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Organization:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    if payload.name is not None:
        org.name = payload.name.strip()

    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Organization name already exists",
        ) from exc
    await db.refresh(org)
    return org


@router.delete("/{org_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_org(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    org = await db.get(Organization, org_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")

    await db.delete(org)
    await db.commit()
    return None

