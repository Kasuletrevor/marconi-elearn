from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.audit import create_audit_event
from app.crud.assignment_extensions import (
    delete_assignment_extension,
    get_assignment_extension,
    list_assignment_extensions,
    upsert_assignment_extension,
)
from app.crud.assignments import get_assignment
from app.db.deps import get_db
from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole
from app.models.user import User
from app.schemas.assignment_extension import AssignmentExtensionOut, AssignmentExtensionUpsert

router = APIRouter(
    prefix="/staff/courses/{course_id}/assignments/{assignment_id}/extensions",
    dependencies=[Depends(get_current_user)],
)


async def _require_assignment_in_course(
    db: AsyncSession, *, course_id: int, assignment_id: int
) -> None:
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")


async def _require_student_in_course(
    db: AsyncSession, *, course_id: int, user_id: int
) -> None:
    result = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == user_id,
            CourseMembership.role == CourseRole.student,
        )
    )
    if result.scalars().first() is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User is not a student in this course",
        )


@router.get("", response_model=list[AssignmentExtensionOut])
async def list_extensions(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 200,
) -> list[AssignmentExtensionOut]:
    await require_course_staff(course_id, current_user, db)
    await _require_assignment_in_course(db, course_id=course_id, assignment_id=assignment_id)
    return await list_assignment_extensions(db, assignment_id=assignment_id, offset=offset, limit=limit)


@router.get("/{user_id}", response_model=AssignmentExtensionOut)
async def get_extension(
    course_id: int,
    assignment_id: int,
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AssignmentExtensionOut:
    await require_course_staff(course_id, current_user, db)
    await _require_assignment_in_course(db, course_id=course_id, assignment_id=assignment_id)
    ext = await get_assignment_extension(db, assignment_id=assignment_id, user_id=user_id)
    if ext is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extension not found")
    return ext


@router.put("/{user_id}", response_model=AssignmentExtensionOut)
async def upsert_extension(
    course_id: int,
    assignment_id: int,
    user_id: int,
    payload: AssignmentExtensionUpsert,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AssignmentExtensionOut:
    await require_course_staff(course_id, current_user, db)
    await _require_assignment_in_course(db, course_id=course_id, assignment_id=assignment_id)
    await _require_student_in_course(db, course_id=course_id, user_id=user_id)
    updated = await upsert_assignment_extension(
        db,
        assignment_id=assignment_id,
        user_id=user_id,
        extended_due_date=payload.extended_due_date,
    )
    try:
        course = await db.get(Course, course_id)
        await create_audit_event(
            db,
            organization_id=None if course is None else course.organization_id,
            actor_user_id=current_user.id,
            action="assignment_extension.upserted",
            target_type="assignment",
            target_id=assignment_id,
            metadata={"student_user_id": user_id, "extended_due_date": str(payload.extended_due_date)},
        )
    except Exception:
        pass
    return updated


@router.delete("/{user_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_extension(
    course_id: int,
    assignment_id: int,
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await require_course_staff(course_id, current_user, db)
    await _require_assignment_in_course(db, course_id=course_id, assignment_id=assignment_id)
    ext = await get_assignment_extension(db, assignment_id=assignment_id, user_id=user_id)
    if ext is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Extension not found")
    await delete_assignment_extension(db, extension=ext)
    try:
        course = await db.get(Course, course_id)
        await create_audit_event(
            db,
            organization_id=None if course is None else course.organization_id,
            actor_user_id=current_user.id,
            action="assignment_extension.deleted",
            target_type="assignment",
            target_id=assignment_id,
            metadata={"student_user_id": user_id},
        )
    except Exception:
        pass
    return None
