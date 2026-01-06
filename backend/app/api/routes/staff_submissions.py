from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.crud.staff_submissions import get_staff_submission_row, list_staff_submission_rows
from app.db.deps import get_db
from app.models.submission import SubmissionStatus
from app.models.user import User
from app.schemas.staff_submissions import StaffSubmissionDetail, StaffSubmissionQueueItem, StaffSubmissionUpdate
from app.schemas.submission import SubmissionOut

router = APIRouter(prefix="/staff/submissions", dependencies=[Depends(get_current_user)])


def _to_queue_item(row) -> StaffSubmissionQueueItem:
    profile = row.student_profile
    return StaffSubmissionQueueItem(
        id=row.submission.id,
        course_id=row.course.id,
        course_code=row.course.code,
        course_title=row.course.title,
        assignment_id=row.assignment.id,
        assignment_title=row.assignment.title,
        max_points=row.assignment.max_points,
        student_user_id=row.student.id,
        student_email=row.student.email,
        student_full_name=profile.full_name if profile else None,
        student_programme=profile.programme if profile else None,
        student_number=row.student_number,
        file_name=row.submission.file_name,
        submitted_at=row.submission.submitted_at,
        status=row.submission.status,
        score=row.submission.score,
        feedback=row.submission.feedback,
    )


@router.get("", response_model=list[StaffSubmissionQueueItem])
async def list_submissions_queue(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    course_id: int | None = None,
    status_filter: SubmissionStatus | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[StaffSubmissionQueueItem]:
    rows = await list_staff_submission_rows(
        db,
        staff_user_id=current_user.id,
        course_id=course_id,
        status=status_filter,
        offset=offset,
        limit=limit,
    )
    return [_to_queue_item(r) for r in rows]


@router.get("/{submission_id}", response_model=StaffSubmissionDetail)
async def get_submission_detail(
    submission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StaffSubmissionDetail:
    row = await get_staff_submission_row(db, staff_user_id=current_user.id, submission_id=submission_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    item = _to_queue_item(row)
    return StaffSubmissionDetail(**item.model_dump(), content_type=row.submission.content_type, size_bytes=row.submission.size_bytes)


@router.patch("/{submission_id}", response_model=SubmissionOut)
async def update_submission(
    submission_id: int,
    payload: StaffSubmissionUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SubmissionOut:
    row = await get_staff_submission_row(db, staff_user_id=current_user.id, submission_id=submission_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    submission = row.submission
    assignment = row.assignment

    if payload.score is not None and payload.score > assignment.max_points:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Score exceeds max_points")

    if payload.status is not None:
        submission.status = payload.status

    if payload.score is not None:
        submission.score = payload.score
        if payload.status is None:
            submission.status = SubmissionStatus.graded

    if payload.feedback is not None:
        submission.feedback = payload.feedback

    await db.commit()
    await db.refresh(submission)
    return submission


@router.get("/{submission_id}/download")
async def download_submission(
    submission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> Response:
    row = await get_staff_submission_row(db, staff_user_id=current_user.id, submission_id=submission_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    storage_path = Path(row.submission.storage_path)
    if not storage_path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return FileResponse(
        path=storage_path,
        filename=row.submission.file_name,
        media_type=row.submission.content_type or "application/octet-stream",
    )

