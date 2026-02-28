"""CSV export endpoints for staff (gradebook, roster, submissions, audit)."""

from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.courses import get_course
from app.crud.exports import (
    export_audit_csv,
    export_gradebook_csv,
    export_roster_csv,
    export_submissions_csv,
)
from app.db.deps import get_db
from app.models.user import User

router = APIRouter(
    prefix="/staff/courses/{course_id}/export",
    dependencies=[Depends(get_current_user), Depends(require_course_staff)],
)


def _csv_response(csv_data: str, filename: str) -> StreamingResponse:
    return StreamingResponse(
        iter([csv_data]),
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.get("/gradebook")
async def export_gradebook(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StreamingResponse:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    data = await export_gradebook_csv(db, course_id=course_id)
    return _csv_response(data, f"gradebook_{course.code}_{course_id}.csv")


@router.get("/roster")
async def export_roster(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StreamingResponse:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    data = await export_roster_csv(db, course_id=course_id)
    return _csv_response(data, f"roster_{course.code}_{course_id}.csv")


@router.get("/submissions")
async def export_submissions(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    assignment_id: int | None = None,
) -> StreamingResponse:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    data = await export_submissions_csv(db, course_id=course_id, assignment_id=assignment_id)
    suffix = f"_assignment{assignment_id}" if assignment_id else ""
    return _csv_response(data, f"submissions_{course.code}{suffix}_{course_id}.csv")


@router.get("/audit")
async def export_audit(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StreamingResponse:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    data = await export_audit_csv(db, organization_id=course.organization_id)
    return _csv_response(data, f"audit_{course.code}_{course_id}.csv")
