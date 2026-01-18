from __future__ import annotations

import logging
from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff, require_course_student_or_staff
from app.core.config import settings
from app.crud.assignments import get_assignment
from app.crud.courses import get_course
from app.crud.submissions import create_submission, list_submissions
from app.db.deps import get_db
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.submission import SubmissionOut
from app.worker.enqueue import enqueue_grading

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/orgs/{org_id}/courses/{course_id}/assignments/{assignment_id}/submissions")

_ALLOWED_EXTENSIONS = {".c", ".cpp", ".zip"}
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024


async def _require_course_and_assignment(
    db: AsyncSession, *, org_id: int, course_id: int, assignment_id: int    
) -> Assignment:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assignment = await get_assignment(db, assignment_id=assignment_id)      
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment


def _uploads_root() -> Path:
    root = Path(settings.uploads_dir).expanduser()
    root.mkdir(parents=True, exist_ok=True)
    return root


async def _read_upload_limited(file: UploadFile, *, max_bytes: int) -> bytes:
    buf = bytearray()
    chunk_size = 1024 * 1024
    while True:
        chunk = await file.read(chunk_size)
        if not chunk:
            break
        buf.extend(chunk)
        if len(buf) > max_bytes:
            raise HTTPException(
                status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE,
                detail="File too large",
            )
    return bytes(buf)


@router.post("", response_model=SubmissionOut, status_code=status.HTTP_201_CREATED)
async def upload_submission(
    org_id: int,
    course_id: int,
    assignment_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SubmissionOut:
    assignment = await _require_course_and_assignment(
        db, org_id=org_id, course_id=course_id, assignment_id=assignment_id
    )
    await require_course_student_or_staff(course_id, current_user, db)      

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")
    ext = Path(file.filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")
    if ext == ".zip" and not bool(getattr(assignment, "allows_zip", False)):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This assignment does not accept ZIP submissions",
        )

    data = await _read_upload_limited(file, max_bytes=_MAX_UPLOAD_BYTES)

    dest = _uploads_root() / f"{uuid4().hex}{ext}"
    dest.write_bytes(data)

    submission = await create_submission(
        db,
        assignment_id=assignment_id,
        user_id=current_user.id,
        file_name=file.filename,
        content_type=file.content_type,
        size_bytes=len(data),
        storage_path=str(dest),
    )
    try:
        await enqueue_grading(submission_id=submission.id)
    except Exception:
        # Best-effort only.
        logger.exception("Failed to enqueue grading job. submission_id=%s", submission.id)
    return submission


@router.get("", response_model=list[SubmissionOut])
async def list_assignment_submissions(
    org_id: int,
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
    offset: int = 0,
    limit: int = 100,
) -> list[SubmissionOut]:
    await _require_course_and_assignment(
        db, org_id=org_id, course_id=course_id, assignment_id=assignment_id
    )
    return await list_submissions(db, assignment_id=assignment_id, offset=offset, limit=limit)
