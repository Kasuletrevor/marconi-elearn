from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_instructor, require_course_staff
from app.crud.courses import UNSET, get_course, update_course
from app.crud.staff_courses import list_staff_courses
from app.db.deps import get_db
from app.models.user import User
from app.schemas.course import CourseOut, CourseUpdate

router = APIRouter(prefix="/staff/courses", dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CourseOut])
async def list_my_staff_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[CourseOut]:
    return await list_staff_courses(db, user_id=current_user.id, offset=offset, limit=limit)


@router.get("/{course_id}", response_model=CourseOut)
async def get_staff_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    await require_course_staff(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_staff_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    await require_course_instructor(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    fields = payload.model_fields_set
    return await update_course(
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
    )
