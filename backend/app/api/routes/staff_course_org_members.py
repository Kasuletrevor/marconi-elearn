from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.courses import get_course
from app.crud.org_memberships import list_memberships
from app.db.deps import get_db
from app.models.user import User
from app.schemas.org_membership import OrgMembershipOut

router = APIRouter(
    prefix="/staff/courses/{course_id}/org-members",
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[OrgMembershipOut])
async def list_org_members_for_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[OrgMembershipOut]:
    await require_course_staff(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return await list_memberships(db, organization_id=course.organization_id, offset=offset, limit=limit)

