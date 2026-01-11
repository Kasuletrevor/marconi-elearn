from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.courses import get_course
from app.crud.invites import RosterRow, create_course_student_invites, parse_roster_from_csv_bytes
from app.db.deps import get_db
from app.models.user import User

router = APIRouter(prefix="/staff/courses/{course_id}/invites", dependencies=[Depends(get_current_user)])


class CourseStudentInviteByEmail(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=1, max_length=200)
    student_number: str = Field(min_length=1, max_length=50)
    programme: str = Field(min_length=1, max_length=200)


@router.post("/by-email", status_code=status.HTTP_201_CREATED)
async def invite_student_by_email(
    course_id: int,
    payload: CourseStudentInviteByEmail,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    await require_course_staff(course_id, current_user, db)

    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    tokens, auto_enrolled, issues = await create_course_student_invites(
        db,
        organization_id=course.organization_id,
        course_id=course_id,
        rows=[
            RosterRow(
                email=payload.email,
                full_name=payload.full_name,
                student_number=payload.student_number,
                programme=payload.programme,
            )
        ],
        expires_in_days=7,
    )
    invite_links = [f"/invite/{t}" for t in tokens]
    return {
        "created_invites": len(tokens),
        "auto_enrolled": auto_enrolled,
        "issues": [i.__dict__ for i in issues],
        "invite_links": invite_links,
    }


@router.post("/import-csv")
async def import_roster_csv(
    course_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    await require_course_staff(course_id, current_user, db)

    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    data = await file.read()
    try:
        roster_rows = parse_roster_from_csv_bytes(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    tokens, auto_enrolled, issues = await create_course_student_invites(
        db,
        organization_id=course.organization_id,
        course_id=course_id,
        rows=roster_rows,
        expires_in_days=7,
    )

    invite_links = [f"/invite/{t}" for t in tokens]
    return {
        "created_invites": len(tokens),
        "auto_enrolled": auto_enrolled,
        "issues": [i.__dict__ for i in issues],
        "invite_links": invite_links,
    }
