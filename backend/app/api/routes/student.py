from pathlib import Path
from typing import Annotated, Any
from uuid import uuid4

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_student_or_staff
from app.crud.assignments import get_assignment
from app.crud.submissions import create_submission, list_submissions
from app.crud.student_views import list_course_assignments, list_course_modules, list_my_courses
from app.db.deps import get_db
from app.models.user import User
from app.schemas.assignment import AssignmentOut
from app.schemas.course import CourseOut
from app.schemas.module import ModuleOut
from app.schemas.submission import SubmissionOut

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
    response_model=list[SubmissionOut],
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
    return await list_submissions(
        db,
        assignment_id=assignment_id,
        user_id=current_user.id,
        offset=offset,
        limit=limit,
    )


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
