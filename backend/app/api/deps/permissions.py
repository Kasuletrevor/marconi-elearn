from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.superadmin import is_superadmin
from app.db.deps import get_db
from app.models.organization_membership import OrgRole, OrganizationMembership
from app.models.user import User


async def require_org_admin(
    org_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    if is_superadmin(current_user):
        return
    result = await db.execute(
        select(OrganizationMembership).where(
            OrganizationMembership.organization_id == org_id,
            OrganizationMembership.user_id == current_user.id,
            OrganizationMembership.role == OrgRole.admin,
        )
    )
    membership = result.scalars().first()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Admin role required")
