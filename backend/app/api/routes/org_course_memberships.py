from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.api.deps.permissions import require_org_admin
from app.crud.course_memberships import (
    CourseMembershipExistsError,
    add_course_membership,
    delete_course_membership,
    get_course_membership,
    list_course_memberships,
)
from app.crud.courses import get_course
from app.db.deps import get_db
from app.schemas.course_membership import CourseMembershipCreate, CourseMembershipOut

router = APIRouter(
    prefix="/orgs/{org_id}/courses/{course_id}/memberships",
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)


async def _require_course_in_org(db: AsyncSession, *, org_id: int, course_id: int) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")


@router.post("", response_model=CourseMembershipOut, status_code=status.HTTP_201_CREATED)
async def enroll_user(
    org_id: int,
    course_id: int,
    payload: CourseMembershipCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
) -> CourseMembershipOut:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    try:
        return await add_course_membership(db, course_id=course_id, user_id=payload.user_id, role=payload.role)
    except CourseMembershipExistsError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User already in course") from exc


@router.get("", response_model=list[CourseMembershipOut])
async def list_course_roster(
    org_id: int,
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
    offset: int = 0,
    limit: int = 100,
) -> list[CourseMembershipOut]:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    return await list_course_memberships(db, course_id=course_id, offset=offset, limit=limit)


@router.delete("/{membership_id}", status_code=status.HTTP_204_NO_CONTENT)
async def remove_from_course(
    org_id: int,
    course_id: int,
    membership_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
) -> None:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    membership = await get_course_membership(db, membership_id=membership_id)
    if membership is None or membership.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Membership not found")
    await delete_course_membership(db, membership=membership)
    return None

