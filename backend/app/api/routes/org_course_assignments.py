from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.assignments import create_assignment, delete_assignment, get_assignment, list_assignments, update_assignment
from app.crud.courses import get_course
from app.crud.modules import get_module
from app.db.deps import get_db
from app.schemas.assignment import AssignmentCreate, AssignmentOut, AssignmentUpdate

router = APIRouter(
    prefix="/orgs/{org_id}/courses/{course_id}/assignments",
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)


async def _require_course_in_org(db: AsyncSession, *, org_id: int, course_id: int) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")


async def _validate_module(db: AsyncSession, *, course_id: int, module_id: int | None) -> None:
    if module_id is None:
        return
    module = await get_module(db, module_id=module_id)
    if module is None or module.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid module_id for course")


@router.post("", response_model=AssignmentOut, status_code=status.HTTP_201_CREATED)
async def create_assignment_in_course(
    org_id: int,
    course_id: int,
    payload: AssignmentCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AssignmentOut:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
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
        allows_zip=payload.allows_zip,
        expected_filename=payload.expected_filename,
        compile_command=payload.compile_command,
    )


@router.get("", response_model=list[AssignmentOut])
async def list_assignments_in_course(
    org_id: int,
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[AssignmentOut]:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    return await list_assignments(db, course_id=course_id, offset=offset, limit=limit)


@router.get("/{assignment_id}", response_model=AssignmentOut)
async def get_assignment_in_course(
    org_id: int,
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AssignmentOut:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    return assignment


@router.patch("/{assignment_id}", response_model=AssignmentOut)
async def update_assignment_in_course(
    org_id: int,
    course_id: int,
    assignment_id: int,
    payload: AssignmentUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> AssignmentOut:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await _validate_module(db, course_id=course_id, module_id=payload.module_id)
    return await update_assignment(
        db,
        assignment=assignment,
        title=payload.title,
        description=payload.description,
        module_id=payload.module_id,
        due_date=payload.due_date,
        max_points=payload.max_points,
        late_policy=payload.late_policy.model_dump() if payload.late_policy is not None else None,
        allows_zip=payload.allows_zip,
        expected_filename=payload.expected_filename,
        compile_command=payload.compile_command,
    )


@router.delete("/{assignment_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment_in_course(
    org_id: int,
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")
    await delete_assignment(db, assignment=assignment)
    return None
