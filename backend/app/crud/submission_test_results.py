from __future__ import annotations

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission_test_result import SubmissionTestResult


async def replace_submission_test_results(
    db: AsyncSession,
    *,
    submission_id: int,
    results: list[SubmissionTestResult],
) -> None:
    await db.execute(delete(SubmissionTestResult).where(SubmissionTestResult.submission_id == submission_id))
    for r in results:
        db.add(r)
    await db.commit()


async def list_submission_test_results(
    db: AsyncSession,
    *,
    submission_id: int,
) -> list[SubmissionTestResult]:
    result = await db.execute(
        select(SubmissionTestResult)
        .where(SubmissionTestResult.submission_id == submission_id)
        .order_by(SubmissionTestResult.id.asc())
    )
    return list(result.scalars().all())


async def delete_submission_test_results(db: AsyncSession, *, submission_id: int) -> None:
    await db.execute(
        delete(SubmissionTestResult).where(SubmissionTestResult.submission_id == submission_id)
    )
    await db.commit()
