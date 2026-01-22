from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission_test_result import SubmissionTestResult


async def replace_submission_test_results(
    db: AsyncSession,
    *,
    submission_id: int,
    results: list[SubmissionTestResult],
    phase: str | None = None,
    commit: bool = True,
) -> None:
    stmt = delete(SubmissionTestResult).where(SubmissionTestResult.submission_id == submission_id)
    if phase is not None:
        stmt = stmt.where(SubmissionTestResult.phase == phase)
    await db.execute(stmt)
    for r in results:
        db.add(r)
    if commit:
        await db.commit()


async def list_submission_test_results(
    db: AsyncSession,
    *,
    submission_id: int,
    phase: str | None = None,
) -> list[SubmissionTestResult]:
    stmt = select(SubmissionTestResult).where(SubmissionTestResult.submission_id == submission_id)
    if phase is not None:
        stmt = stmt.where(SubmissionTestResult.phase == phase)
    result = await db.execute(stmt.order_by(SubmissionTestResult.id.asc()))
    return list(result.scalars().all())


async def delete_submission_test_results(
    db: AsyncSession, *, submission_id: int, phase: str | None = None
) -> None:
    stmt = delete(SubmissionTestResult).where(SubmissionTestResult.submission_id == submission_id)
    if phase is not None:
        stmt = stmt.where(SubmissionTestResult.phase == phase)
    await db.execute(stmt)
    await db.commit()
