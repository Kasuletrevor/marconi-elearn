from datetime import datetime
from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_student_or_staff
from app.crud.assignments import get_assignment
from app.crud.assignment_extensions import (
    get_assignment_extension,
    list_assignment_extensions_for_user,
)
from app.crud.late_policy import (
    compute_effective_due_date,
    compute_late_penalty_percent,
    resolve_late_policy,
)
from app.crud.submissions import create_submission, list_submissions
from app.crud.student_submissions import get_student_submission_row, list_student_submission_rows
from app.crud.student_views import list_course_assignments, list_course_modules, list_my_courses
from app.db.deps import get_db
from app.models.course import Course
from app.models.user import User
from app.schemas.assignment import AssignmentOut
from app.schemas.course import CourseOut
from app.schemas.module import ModuleOut
from app.schemas.student_submissions import StudentSubmissionItem
from app.schemas.submission import SubmissionOut, SubmissionStudentOut

router = APIRouter(prefix="/student", dependencies=[Depends(get_current_user)])

_ALLOWED_EXTENSIONS = {".c", ".cpp", ".h", ".hpp", ".zip"}
_MAX_UPLOAD_BYTES = 5 * 1024 * 1024


def _uploads_root() -> Path:
    root = Path(__file__).resolve().parents[3] / "var" / "uploads"
    root.mkdir(parents=True, exist_ok=True)
    return root


@router.get("/courses", response_model=list[CourseOut])
async def my_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> Any:
    return await list_my_courses(db, user_id=current_user.id, offset=offset, limit=limit)


@router.get("/courses/{course_id}/modules", response_model=list[ModuleOut])
async def course_modules(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> Any:
    await require_course_student_or_staff(course_id, current_user, db)
    return await list_course_modules(db, course_id=course_id, offset=offset, limit=limit)


@router.get("/courses/{course_id}/assignments", response_model=list[AssignmentOut])
async def course_assignments(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> Any:
    await require_course_student_or_staff(course_id, current_user, db)
    return await list_course_assignments(db, course_id=course_id, offset=offset, limit=limit)


@router.get(
    "/courses/{course_id}/assignments/{assignment_id}/submissions",
    response_model=list[SubmissionStudentOut],
)
async def my_assignment_submissions(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> Any:
    await require_course_student_or_staff(course_id, current_user, db)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    course = await db.get(Course, course_id)
    extension = await get_assignment_extension(
        db, assignment_id=assignment_id, user_id=current_user.id
    )
    effective_due_date = compute_effective_due_date(
        assignment_due_date=assignment.due_date,
        extension_due_date=None if extension is None else extension.extended_due_date,
    )
    policy = resolve_late_policy(
        course_policy=None if course is None else course.late_policy,
        assignment_policy=assignment.late_policy,
    )

    submissions = await list_submissions(
        db,
        assignment_id=assignment_id,
        user_id=current_user.id,
        offset=offset,
        limit=limit,
    )

    out: list[SubmissionStudentOut] = []
    for submission in submissions:
        late_seconds, late_penalty_percent = compute_late_penalty_percent(
            submitted_at=submission.created_at,
            effective_due_date=effective_due_date,
            policy=policy,
        )
        out.append(
            SubmissionStudentOut(
                id=submission.id,
                assignment_id=submission.assignment_id,
                user_id=submission.user_id,
                file_name=submission.file_name,
                file_path=submission.file_path,
                content_type=submission.content_type,
                size_bytes=submission.size_bytes,
                created_at=submission.created_at,
                submitted_at=submission.submitted_at,
                status=submission.status,
                score=submission.score,
                feedback=submission.feedback,
                effective_due_date=effective_due_date,
                late_seconds=late_seconds,
                late_penalty_percent=late_penalty_percent,
            )
        )
    return out


@router.post(
    "/courses/{course_id}/assignments/{assignment_id}/submissions",
    response_model=SubmissionOut,
    status_code=status.HTTP_201_CREATED,
)
async def submit_assignment(
    course_id: int,
    assignment_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> SubmissionOut:
    await require_course_student_or_staff(course_id, current_user, db)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")
    ext = Path(file.filename).suffix.lower()
    if ext not in _ALLOWED_EXTENSIONS:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Unsupported file type")

    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

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
    return submission


@router.get("/submissions", response_model=list[StudentSubmissionItem])
async def my_submissions(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    course_id: int | None = None,
    assignment_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[StudentSubmissionItem]:
    rows = await list_student_submission_rows(
        db,
        user_id=current_user.id,
        course_id=course_id,
        assignment_id=assignment_id,
        offset=offset,
        limit=limit,
    )
    assignment_ids = sorted({r.assignment.id for r in rows})
    extensions = await list_assignment_extensions_for_user(
        db, user_id=current_user.id, assignment_ids=assignment_ids
    )
    extension_by_assignment: dict[int, datetime] = {
        e.assignment_id: e.extended_due_date for e in extensions
    }

    out: list[StudentSubmissionItem] = []
    for row in rows:
        effective_due_date = compute_effective_due_date(
            assignment_due_date=row.assignment.due_date,
            extension_due_date=extension_by_assignment.get(row.assignment.id),
        )
        policy = resolve_late_policy(
            course_policy=row.course.late_policy,
            assignment_policy=row.assignment.late_policy,
        )
        late_seconds, late_penalty_percent = compute_late_penalty_percent(
            submitted_at=row.submission.created_at,
            effective_due_date=effective_due_date,
            policy=policy,
        )
        out.append(
            StudentSubmissionItem(
                id=row.submission.id,
                course_id=row.course.id,
                course_code=row.course.code,
                course_title=row.course.title,
                assignment_id=row.assignment.id,
                assignment_title=row.assignment.title,
                max_points=row.assignment.max_points,
                file_name=row.submission.file_name,
                submitted_at=row.submission.submitted_at,
                status=row.submission.status,
                score=row.submission.score,
                feedback=row.submission.feedback,
                due_date=row.assignment.due_date,
                effective_due_date=effective_due_date,
                late_seconds=late_seconds,
                late_penalty_percent=late_penalty_percent,
            )
        )
    return out


@router.get("/submissions/{submission_id}/download")
async def download_my_submission(
    submission_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    row = await get_student_submission_row(db, user_id=current_user.id, submission_id=submission_id)
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
