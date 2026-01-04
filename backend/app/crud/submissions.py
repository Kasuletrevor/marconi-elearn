from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.submission import Submission


async def create_submission(
    db: AsyncSession,
    *,
    assignment_id: int,
    user_id: int,
    file_name: str,
    content_type: str | None,
    size_bytes: int,
    storage_path: str,
) -> Submission:
    submission = Submission(
        assignment_id=assignment_id,
        user_id=user_id,
        file_name=file_name,
        content_type=content_type,
        size_bytes=size_bytes,
        storage_path=storage_path,
    )
    db.add(submission)
    await db.commit()
    await db.refresh(submission)
    return submission


async def list_submissions(
    db: AsyncSession,
    *,
    assignment_id: int,
    user_id: int | None = None,
    offset: int = 0,
    limit: int = 100,
) -> list[Submission]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    stmt = select(Submission).where(Submission.assignment_id == assignment_id).order_by(Submission.id.desc())
    if user_id is not None:
        stmt = stmt.where(Submission.user_id == user_id)
    result = await db.execute(stmt.offset(offset).limit(limit))
    return list(result.scalars().all())

