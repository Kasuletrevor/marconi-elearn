from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.superadmin import require_superadmin
from app.crud.organizations import list_organizations
from app.db.deps import get_db
from app.schemas.organization import OrganizationOut

router = APIRouter(prefix="/superadmin/organizations", dependencies=[Depends(require_superadmin)])


@router.get("", response_model=list[OrganizationOut])
async def list_all_organizations(
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[OrganizationOut]:
    return await list_organizations(db, offset=offset, limit=limit)

