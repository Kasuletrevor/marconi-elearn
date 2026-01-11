from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.deps import get_db
from app.models.course_membership import CourseMembership, CourseRole
from app.models.user import User


async def require_course_staff(
    course_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == current_user.id,
            CourseMembership.role.in_([CourseRole.owner, CourseRole.co_lecturer, CourseRole.ta]),
        )
    )
    membership = result.scalars().first()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course staff role required")


async def require_course_instructor(
    course_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    result = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == current_user.id,
            CourseMembership.role.in_([CourseRole.owner, CourseRole.co_lecturer]),
        )
    )
    membership = result.scalars().first()
    if membership is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Course instructor role required",
        )


async def require_course_student_or_staff(
    course_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> CourseRole:
    result = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == current_user.id,
        )
    )
    membership = result.scalars().first()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course enrollment required")
    return membership.role
