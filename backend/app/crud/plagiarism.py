"""CRUD operations for plagiarism detection runs and pairs."""

from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.plagiarism_pair import PlagiarismPair
from app.models.plagiarism_run import PlagiarismRun


async def create_plagiarism_run(
    db: AsyncSession,
    *,
    course_id: int,
    assignment_id: int,
    initiated_by_user_id: int,
) -> PlagiarismRun:
    run = PlagiarismRun(
        course_id=course_id,
        assignment_id=assignment_id,
        initiated_by_user_id=initiated_by_user_id,
        status="pending",
    )
    db.add(run)
    await db.commit()
    await db.refresh(run)
    return run


async def get_plagiarism_run(db: AsyncSession, *, run_id: int) -> PlagiarismRun | None:
    return await db.get(PlagiarismRun, run_id)


async def list_plagiarism_runs(
    db: AsyncSession,
    *,
    assignment_id: int,
    offset: int = 0,
    limit: int = 50,
) -> list[PlagiarismRun]:
    offset = max(0, offset)
    limit = min(max(1, limit), 200)
    result = await db.execute(
        select(PlagiarismRun)
        .where(PlagiarismRun.assignment_id == assignment_id)
        .order_by(PlagiarismRun.id.desc())
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def update_run_status(
    db: AsyncSession,
    *,
    run: PlagiarismRun,
    status: str,
    moss_report_url: str | None = None,
    error_message: str | None = None,
    pair_count: int | None = None,
) -> PlagiarismRun:
    run.status = status
    if moss_report_url is not None:
        run.moss_report_url = moss_report_url
    if error_message is not None:
        run.error_message = error_message
    if pair_count is not None:
        run.pair_count = pair_count
    if status in ("completed", "error"):
        run.completed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(run)
    return run


async def bulk_create_pairs(
    db: AsyncSession,
    *,
    run_id: int,
    pairs: list[dict],
) -> int:
    """Insert multiple plagiarism pairs. Returns count inserted."""
    if not pairs:
        return 0
    objects = [PlagiarismPair(run_id=run_id, **p) for p in pairs]
    db.add_all(objects)
    await db.commit()
    return len(objects)


async def list_plagiarism_pairs(
    db: AsyncSession,
    *,
    run_id: int,
    min_similarity: int = 0,
    offset: int = 0,
    limit: int = 200,
) -> list[PlagiarismPair]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    stmt = (
        select(PlagiarismPair)
        .where(PlagiarismPair.run_id == run_id)
        .where(PlagiarismPair.similarity_pct >= min_similarity)
        .order_by(PlagiarismPair.similarity_pct.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.scalars().all())
