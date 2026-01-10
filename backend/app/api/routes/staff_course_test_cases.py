from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.assignments import get_assignment
from app.crud.courses import get_course
from app.crud.test_cases import (
    create_test_case,
    delete_test_case,
    get_test_case,
    list_test_cases,
    update_test_case,
)
from app.db.deps import get_db
from app.models.user import User
from app.schemas.test_case import TestCaseCreate, TestCaseOut, TestCaseUpdate

router = APIRouter(
    prefix="/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
    dependencies=[Depends(get_current_user)],
)


async def _require_course_and_assignment(
    db: AsyncSession, *, course_id: int, assignment_id: int
) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    assignment = await get_assignment(db, assignment_id=assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Assignment not found")


@router.get("", response_model=list[TestCaseOut])
async def list_assignment_test_cases(
    course_id: int,
    assignment_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[TestCaseOut]:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_assignment(db, course_id=course_id, assignment_id=assignment_id)
    return await list_test_cases(db, assignment_id=assignment_id, offset=offset, limit=limit)


@router.post("", response_model=TestCaseOut, status_code=status.HTTP_201_CREATED)
async def create_assignment_test_case(
    course_id: int,
    assignment_id: int,
    payload: TestCaseCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TestCaseOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_assignment(db, course_id=course_id, assignment_id=assignment_id)
    return await create_test_case(
        db,
        assignment_id=assignment_id,
        name=payload.name,
        position=payload.position,
        points=payload.points,
        is_hidden=payload.is_hidden,
        stdin=payload.stdin,
        expected_stdout=payload.expected_stdout,
        expected_stderr=payload.expected_stderr,
    )


@router.patch("/{test_case_id}", response_model=TestCaseOut)
async def update_assignment_test_case(
    course_id: int,
    assignment_id: int,
    test_case_id: int,
    payload: TestCaseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> TestCaseOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_assignment(db, course_id=course_id, assignment_id=assignment_id)
    test_case = await get_test_case(db, test_case_id=test_case_id)
    if test_case is None or test_case.assignment_id != assignment_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")
    return await update_test_case(
        db,
        test_case=test_case,
        name=payload.name,
        position=payload.position,
        points=payload.points,
        is_hidden=payload.is_hidden,
        stdin=payload.stdin,
        expected_stdout=payload.expected_stdout,
        expected_stderr=payload.expected_stderr,
    )


@router.delete("/{test_case_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_assignment_test_case(
    course_id: int,
    assignment_id: int,
    test_case_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_assignment(db, course_id=course_id, assignment_id=assignment_id)
    test_case = await get_test_case(db, test_case_id=test_case_id)
    if test_case is None or test_case.assignment_id != assignment_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Test case not found")
    await delete_test_case(db, test_case=test_case)
    return None

