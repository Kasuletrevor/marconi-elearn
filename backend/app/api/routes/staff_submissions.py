from __future__ import annotations

import logging
from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Response, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.crud.audit import enqueue_audit_event
from app.crud.notifications import create_notification
from app.crud.staff_submissions import (
    count_staff_submission_rows,
    get_next_ungraded_staff_submission_row,
    get_staff_submission_row,
    list_staff_submission_rows,
    list_staff_submission_rows_by_ids,
)
from app.crud.submission_test_results import delete_submission_test_results, list_submission_test_results
from app.db.deps import get_db
from app.models.submission import SubmissionStatus
from app.models.submission_test_result import SubmissionTestResult
from app.models.user import User
from app.models.notification import NotificationKind
from app.schemas.submission_test_result import SubmissionTestResultOut
from app.schemas.staff_submissions import (
    StaffNextSubmissionOut,
    StaffSubmissionBulkAction,
    StaffSubmissionDetail,
    StaffSubmissionQueueItem,
    StaffSubmissionUpdate,
    StaffSubmissionsBulkRequest,
    StaffSubmissionsBulkResult,
    StaffSubmissionsPage,
    ZipContentsOut,
    ZipEntryOut,
)
from app.schemas.submission import SubmissionOut
from app.worker.enqueue import enqueue_grading
from app.worker.zip_extract import ZipExtractionError, list_zip_contents

logger = logging.getLogger(__name__)

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


@router.get("/page", response_model=StaffSubmissionsPage)
async def list_submissions_page(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    course_id: int | None = None,
    status_filter: SubmissionStatus | None = None,
    offset: int = 0,
    limit: int = 100,
) -> StaffSubmissionsPage:
    effective_offset = max(0, offset)
    effective_limit = min(max(1, limit), 200)
    total = await count_staff_submission_rows(
        db,
        staff_user_id=current_user.id,
        course_id=course_id,
        status=status_filter,
    )
    rows = await list_staff_submission_rows(
        db,
        staff_user_id=current_user.id,
        course_id=course_id,
        status=status_filter,
        offset=effective_offset,
        limit=effective_limit,
    )
    return StaffSubmissionsPage(
        items=[_to_queue_item(r) for r in rows],
        total=total,
        offset=effective_offset,
        limit=effective_limit,
    )


@router.post("/bulk", response_model=StaffSubmissionsBulkResult)
async def bulk_update_submissions(
    payload: StaffSubmissionsBulkRequest,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> StaffSubmissionsBulkResult:
    target_status = {
        StaffSubmissionBulkAction.mark_pending: SubmissionStatus.pending,
        StaffSubmissionBulkAction.mark_grading: SubmissionStatus.grading,
        StaffSubmissionBulkAction.mark_graded: SubmissionStatus.graded,
    }[payload.action]

    rows = await list_staff_submission_rows_by_ids(
        db,
        staff_user_id=current_user.id,
        submission_ids=payload.submission_ids,
    )
    found_ids = {r.submission.id for r in rows}
    skipped_ids = [sid for sid in payload.submission_ids if sid not in found_ids]

    prior_status_by_id: dict[int, SubmissionStatus] = {
        r.submission.id: r.submission.status for r in rows
    }
    for r in rows:
        r.submission.status = target_status

    await db.commit()

    enqueue_audit_event(
        organization_id=rows[0].course.organization_id if rows else None,
        actor_user_id=current_user.id,
        action="submissions.bulk_updated",
        target_type="submission",
        target_id=None,
        metadata={"count": len(rows), "action": payload.action.value},
        context={"actor_user_id": current_user.id, "submission_ids": payload.submission_ids},
    )

    if target_status == SubmissionStatus.graded:
        for r in rows:
            if prior_status_by_id.get(r.submission.id) == SubmissionStatus.graded:
                continue
            link = f"/dashboard/courses/{r.course.id}/assignments/{r.assignment.id}"
            await create_notification(
                db,
                user_id=r.submission.user_id,
                kind=NotificationKind.submission_graded,
                title=f"Graded: {r.assignment.title}",
                body=None,
                link_url=link,
            )

    return StaffSubmissionsBulkResult(
        updated_ids=sorted(found_ids),
        skipped_ids=skipped_ids,
    )


@router.get("/next", response_model=StaffNextSubmissionOut)
async def next_ungraded_submission(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    course_id: int | None = None,
    status_filter: SubmissionStatus | None = None,
    after_submission_id: int | None = None,
) -> StaffNextSubmissionOut:
    row = await get_next_ungraded_staff_submission_row(
        db,
        staff_user_id=current_user.id,
        course_id=course_id,
        status=status_filter,
        after_submission_id=after_submission_id,
    )
    return StaffNextSubmissionOut(submission_id=None if row is None else row.submission.id)


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


@router.get("/{submission_id}/zip-contents", response_model=ZipContentsOut)
async def get_submission_zip_contents(
    submission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ZipContentsOut:
    row = await get_staff_submission_row(db, staff_user_id=current_user.id, submission_id=submission_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    storage_path = Path(row.submission.storage_path)
    if storage_path.suffix.lower() != ".zip":
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Submission is not a ZIP file")

    try:
        entries = list_zip_contents(storage_path)
    except ZipExtractionError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    files = [ZipEntryOut(name=e.name, size=e.size) for e in entries]
    total_size = sum(e.size for e in entries)
    return ZipContentsOut(files=files, total_size=total_size, file_count=len(entries))


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
    prior_status = submission.status

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

    enqueue_audit_event(
        organization_id=row.course.organization_id,
        actor_user_id=current_user.id,
        action="submission.updated",
        target_type="submission",
        target_id=submission.id,
        metadata={
            "status": submission.status.value,
            "score": submission.score,
        },
        context={"actor_user_id": current_user.id, "submission_id": submission.id},
    )

    if prior_status != SubmissionStatus.graded and submission.status == SubmissionStatus.graded:
        link = f"/dashboard/courses/{row.course.id}/assignments/{row.assignment.id}"
        await create_notification(
            db,
            user_id=submission.user_id,
            kind=NotificationKind.submission_graded,
            title=f"Graded: {row.assignment.title}",
            body=None,
            link_url=link,
        )
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


@router.get("/{submission_id}/tests", response_model=list[SubmissionTestResultOut])
async def list_submission_tests(
    submission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> list[SubmissionTestResultOut]:
    row = await get_staff_submission_row(db, staff_user_id=current_user.id, submission_id=submission_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")
    # Prefer final-phase tests when available.
    from sqlalchemy import select

    has_final = await db.execute(
        select(SubmissionTestResult.id)
        .where(SubmissionTestResult.submission_id == submission_id, SubmissionTestResult.phase == "final")
        .limit(1)
    )
    phase = "final" if has_final.scalar_one_or_none() is not None else "practice"
    return await list_submission_test_results(db, submission_id=submission_id, phase=phase)


@router.post("/{submission_id}/regrade", response_model=SubmissionOut)
async def regrade_submission(
    submission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SubmissionOut:
    row = await get_staff_submission_row(db, staff_user_id=current_user.id, submission_id=submission_id)
    if row is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Submission not found")

    submission = row.submission
    # Prefer final regrade when the assignment has been finalized.
    phase = "final" if row.assignment.final_autograde_enqueued_at is not None else "practice"
    submission.status = SubmissionStatus.pending
    submission.score = None
    submission.feedback = None
    await db.commit()
    await delete_submission_test_results(db, submission_id=submission_id, phase=phase)

    try:
        await enqueue_grading(submission_id=submission_id, phase=phase)
    except Exception:
        logger.exception("Failed to enqueue grading job. submission_id=%s", submission_id)

    await db.refresh(submission)
    return submission
