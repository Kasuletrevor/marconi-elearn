from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.courses import create_course, delete_course, get_course, list_courses, update_course
from app.db.deps import get_db
from app.models.user import User
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses")


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    await require_org_admin(payload.organization_id, current_user, db)
    return await create_course(
        db,
        organization_id=payload.organization_id,
        code=payload.code,
        title=payload.title,
        description=payload.description,
    )


@router.get("", response_model=list[CourseOut])
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    organization_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[CourseOut]:
    if organization_id is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="organization_id is required")
    await require_org_admin(organization_id, _current_user, db)
    return await list_courses(db, organization_id=organization_id, offset=offset, limit=limit)


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await require_org_admin(course.organization_id, _current_user, db)
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
) -> CourseOut:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await require_org_admin(course.organization_id, _current_user, db)
    return await update_course(
        db,
        course=course,
        code=payload.code,
        title=payload.title,
        description=payload.description,
    )


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await require_org_admin(course.organization_id, _current_user, db)
    await delete_course(db, course=course)
    return None
