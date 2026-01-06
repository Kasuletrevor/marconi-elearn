from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.assignments import get_assignment
from app.crud.courses import get_course
from app.crud.submissions import list_submissions
from app.db.deps import get_db
from app.models.user import User
from app.schemas.submission import SubmissionOut

router = APIRouter(
    prefix="/staff/courses/{course_id}/assignments/{assignment_id}/submissions",
    dependencies=[Depends(get_current_user)],
)


async def _require_course_and_assignment(db: AsyncSession, *, course_id: int, assignment_id: int) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")


@router.get("", response_model=list[SubmissionOut])
async def list_assignment_submissions(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[SubmissionOut]:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_assignment(db, course_id=course_id, assignment_id=assignment_id)
    return await list_submissions(db, assignment_id=assignment_id, offset=offset, limit=limit)

