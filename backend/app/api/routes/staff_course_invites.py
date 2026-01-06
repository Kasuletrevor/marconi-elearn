from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.courses import get_course
from app.crud.invites import create_course_student_invites, parse_roster_from_csv_bytes
from app.db.deps import get_db
from app.models.user import User

router = APIRouter(prefix="/staff/courses/{course_id}/invites", dependencies=[Depends(get_current_user)])


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

