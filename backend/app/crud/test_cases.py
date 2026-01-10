from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.test_case import TestCase


async def create_test_case(
    db: AsyncSession,
    *,
    assignment_id: int,
    name: str,
    position: int,
    points: int,
    is_hidden: bool,
    stdin: str,
    expected_stdout: str,
    expected_stderr: str,
) -> TestCase:
    tc = TestCase(
        assignment_id=assignment_id,
        name=name.strip(),
        position=position,
        points=points,
        is_hidden=is_hidden,
        stdin=stdin,
        expected_stdout=expected_stdout,
        expected_stderr=expected_stderr,
    )
    db.add(tc)
    await db.commit()
    await db.refresh(tc)
    return tc


async def list_test_cases(
    db: AsyncSession,
    *,
    assignment_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[TestCase]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(TestCase)
        .where(TestCase.assignment_id == assignment_id)
        .order_by(TestCase.position.asc(), TestCase.id.asc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_test_case(db: AsyncSession, *, test_case_id: int) -> TestCase | None:
    return await db.get(TestCase, test_case_id)


async def update_test_case(
    db: AsyncSession,
    *,
    test_case: TestCase,
    name: str | None,
    position: int | None,
    points: int | None,
    is_hidden: bool | None,
    stdin: str | None,
    expected_stdout: str | None,
    expected_stderr: str | None,
) -> TestCase:
    if name is not None:
        test_case.name = name.strip()
    if position is not None:
        test_case.position = position
    if points is not None:
        test_case.points = points
    if is_hidden is not None:
        test_case.is_hidden = is_hidden
    if stdin is not None:
        test_case.stdin = stdin
    if expected_stdout is not None:
        test_case.expected_stdout = expected_stdout
    if expected_stderr is not None:
        test_case.expected_stderr = expected_stderr
    await db.commit()
    await db.refresh(test_case)
    return test_case


async def delete_test_case(db: AsyncSession, *, test_case: TestCase) -> None:
    await db.delete(test_case)
    await db.commit()

