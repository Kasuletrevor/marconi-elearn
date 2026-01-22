from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.assignments import create_assignment, delete_assignment, get_assignment, list_assignments, update_assignment
from app.crud.courses import get_course
from app.crud.modules import get_module
from app.db.deps import get_db
from app.models.user import User
from app.schemas.assignment import AssignmentCreate, AssignmentOut, AssignmentUpdate

router = APIRouter(prefix="/staff/courses/{course_id}/assignments", dependencies=[Depends(get_current_user)])


async def _require_course(db: AsyncSession, *, course_id: int) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")


async def _validate_module(db: AsyncSession, *, course_id: int, module_id: int | None) -> None:
    if module_id is None:
        return
    module = await get_module(db, module_id=module_id)
    if module is None or module.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid module_id for course")


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment_in_course(
    course_id: int,
    payload: AssignmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AssignmentOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course(db, course_id=course_id)
    await _validate_module(db, course_id=course_id, module_id=payload.module_id)
    return await create_assignment(
        db,
        course_id=course_id,
        module_id=payload.module_id,
        title=payload.title,
        description=payload.description,
        due_date=payload.due_date,
        max_points=payload.max_points,
        late_policy=payload.late_policy.model_dump() if payload.late_policy is not None else None,
        autograde_mode=payload.autograde_mode,
        allows_zip=payload.allows_zip,
        expected_filename=payload.expected_filename,
        compile_command=payload.compile_command,
        created_by_user_id=current_user.id,
    )


@router.get("", response_model=list[AssignmentOut])
async def list_assignments_in_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[AssignmentOut]:
    await require_course_staff(course_id, current_user, db)
    await _require_course(db, course_id=course_id)
    return await list_assignments(db, course_id=course_id, offset=offset, limit=limit)


@router.get("/{assignment_id}", response_model=AssignmentOut)
async def get_assignment_in_course(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AssignmentOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course(db, course_id=course_id)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentOut)
async def update_assignment_in_course(
    course_id: int,
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> AssignmentOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course(db, course_id=course_id)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await _validate_module(db, course_id=course_id, module_id=payload.module_id)
    try:
        return await update_assignment(
            db,
            assignment=assignment,
            title=payload.title,
            description=payload.description,
            module_id=payload.module_id,
            due_date=payload.due_date,
            max_points=payload.max_points,
            late_policy=payload.late_policy.model_dump() if payload.late_policy is not None else None,
            autograde_mode=payload.autograde_mode,
            allows_zip=payload.allows_zip,
            expected_filename=payload.expected_filename,
            compile_command=payload.compile_command,
            updated_by_user_id=current_user.id,
        )
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=str(exc)) from exc


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment_in_course(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await require_course_staff(course_id, current_user, db)
    await _require_course(db, course_id=course_id)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await delete_assignment(db, assignment=assignment)
    return None
