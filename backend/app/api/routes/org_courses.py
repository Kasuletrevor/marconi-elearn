from typing import Annotated

import logging
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.audit import create_audit_event
from app.crud.courses import UNSET, create_course, delete_course, get_course, list_courses, update_course
from app.crud.course_memberships import add_course_membership
from app.db.deps import get_db
from app.models.course_membership import CourseRole
from app.models.user import User
from app.schemas.course import CourseCreateInOrg, CourseOut, CourseUpdate

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/orgs/{org_id}/courses",
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course_in_org(
    org_id: int,
    payload: CourseCreateInOrg,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    course = await create_course(
        db,
        organization_id=org_id,
        code=payload.code,
        title=payload.title,
        description=payload.description,
        semester=payload.semester,
        year=payload.year,
        late_policy=payload.late_policy.model_dump() if payload.late_policy is not None else None,
    )
    await add_course_membership(db, course_id=course.id, user_id=current_user.id, role=CourseRole.owner)
    try:
        await create_audit_event(
            db,
            organization_id=org_id,
            actor_user_id=current_user.id,
            action="course.created",
            target_type="course",
            target_id=course.id,
            metadata={"code": course.code, "title": course.title},
        )
    except Exception:
        logger.exception(
            "Failed to write audit event course.created. org_id=%s actor_user_id=%s course_id=%s",
            org_id,
            current_user.id,
            course.id,
        )
    return course


@router.get("", response_model=list[CourseOut])
async def list_courses_in_org(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[CourseOut]:
    return await list_courses(db, organization_id=org_id, offset=offset, limit=limit)


@router.get("/{course_id}", response_model=CourseOut)
async def get_course_in_org(
    org_id: int,
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseOut:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course_in_org(
    org_id: int,
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    fields = payload.model_fields_set
    updated = await update_course(
        db,
        course=course,
        code=payload.code if "code" in fields else UNSET,
        title=payload.title if "title" in fields else UNSET,
        description=payload.description if "description" in fields else UNSET,
        semester=payload.semester if "semester" in fields else UNSET,
        year=payload.year if "year" in fields else UNSET,
        late_policy=(
            payload.late_policy.model_dump() if payload.late_policy is not None else None
        )
        if "late_policy" in fields
        else UNSET,
        github_classroom_id=payload.github_classroom_id if "github_classroom_id" in fields else UNSET,
        github_classroom_name=payload.github_classroom_name if "github_classroom_name" in fields else UNSET,
    )
    try:
        await create_audit_event(
            db,
            organization_id=org_id,
            actor_user_id=current_user.id,
            action="course.updated",
            target_type="course",
            target_id=updated.id,
            metadata={"code": updated.code, "title": updated.title},
        )
    except Exception:
        logger.exception(
            "Failed to write audit event course.updated. org_id=%s actor_user_id=%s course_id=%s",
            org_id,
            current_user.id,
            updated.id,
        )
    return updated


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course_in_org(
    org_id: int,
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await delete_course(db, course=course)
    try:
        await create_audit_event(
            db,
            organization_id=org_id,
            actor_user_id=current_user.id,
            action="course.deleted",
            target_type="course",
            target_id=course_id,
            metadata={"code": course.code, "title": course.title},
        )
    except Exception:
        logger.exception(
            "Failed to write audit event course.deleted. org_id=%s actor_user_id=%s course_id=%s",
            org_id,
            current_user.id,
            course_id,
        )
    return None
