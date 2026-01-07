from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.assignments import get_assignment
from app.crud.courses import get_course
from app.crud.staff_missing_submissions import (
    list_missing_students_for_assignment,
    list_missing_submissions_summary,
)
from app.db.deps import get_db
from app.models.user import User
from app.schemas.staff_missing_submissions import MissingStudentOut, MissingSubmissionsSummaryItem

router = APIRouter(
    prefix="/staff/courses/{course_id}/missing-submissions",
    dependencies=[Depends(get_current_user)],
)


@router.get("", response_model=list[MissingSubmissionsSummaryItem])
async def missing_submissions_summary(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[MissingSubmissionsSummaryItem]:
    await require_course_staff(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    rows = await list_missing_submissions_summary(db, course_id=course_id)
    return [
        MissingSubmissionsSummaryItem(
            assignment_id=assignment_id,
            assignment_title=title,
            total_students=total_students,
            submitted_count=submitted_count,
            missing_count=missing_count,
        )
        for assignment_id, title, total_students, submitted_count, missing_count in rows
    ]


@router.get("/{assignment_id}", response_model=list[MissingStudentOut])
async def missing_submissions_for_assignment(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[MissingStudentOut]:
    await require_course_staff(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    rows = await list_missing_students_for_assignment(db, course_id=course_id, assignment_id=assignment_id)
    out: list[MissingStudentOut] = []
    for user, profile, student_number in rows:
        out.append(
            MissingStudentOut(
                user_id=user.id,
                email=user.email,
                full_name=profile.full_name if profile else None,
                programme=profile.programme if profile else None,
                student_number=student_number,
            )
        )
    return out

