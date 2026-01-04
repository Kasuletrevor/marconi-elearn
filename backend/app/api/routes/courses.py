from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.courses import create_course, delete_course, get_course, list_courses, update_course
from app.db.deps import get_db
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses")


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseOut:
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
    organization_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[CourseOut]:
    return await list_courses(db, organization_id=organization_id, offset=offset, limit=limit)


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseOut:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseOut:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
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
) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await delete_course(db, course=course)
    return None
