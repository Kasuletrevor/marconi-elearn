from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.models.course import Course
from app.schemas.course import CourseCreate, CourseOut, CourseUpdate

router = APIRouter(prefix="/courses")


@router.post("", response_model=CourseOut, status_code=status.HTTP_201_CREATED)
async def create_course(
    payload: CourseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Course:
    course = Course(
        organization_id=payload.organization_id,
        code=payload.code.strip(),
        title=payload.title.strip(),
        description=payload.description.strip() if payload.description else None,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


@router.get("", response_model=list[CourseOut])
async def list_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    organization_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[Course]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)

    stmt = select(Course).order_by(Course.id)
    if organization_id is not None:
        stmt = stmt.where(Course.organization_id == organization_id)

    result = await db.execute(stmt.offset(offset).limit(limit))
    return list(result.scalars().all())


@router.get("/{course_id}", response_model=CourseOut)
async def get_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Course:
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseOut)
async def update_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> Course:
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    if payload.code is not None:
        course.code = payload.code.strip()
    if payload.title is not None:
        course.title = payload.title.strip()
    if payload.description is not None:
        course.description = payload.description.strip() if payload.description else None

    await db.commit()
    await db.refresh(course)
    return course


@router.delete("/{course_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    course = await db.get(Course, course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    await db.delete(course)
    await db.commit()
    return None

