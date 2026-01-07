from __future__ import annotations

from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment_extension import AssignmentExtension


async def get_assignment_extension(
    db: AsyncSession, *, assignment_id: int, user_id: int
) -> AssignmentExtension | None:
    result = await db.execute(
        select(AssignmentExtension).where(
            AssignmentExtension.assignment_id == assignment_id,
            AssignmentExtension.user_id == user_id,
        )
    )
    return result.scalars().first()


async def list_assignment_extensions(
    db: AsyncSession,
    *,
    assignment_id: int,
    offset: int = 0,
    limit: int = 200,
) -> list[AssignmentExtension]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(AssignmentExtension)
        .where(AssignmentExtension.assignment_id == assignment_id)
        .order_by(AssignmentExtension.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def list_assignment_extensions_for_user(
    db: AsyncSession,
    *,
    user_id: int,
    assignment_ids: list[int],
) -> list[AssignmentExtension]:
    if not assignment_ids:
        return []
    result = await db.execute(
        select(AssignmentExtension).where(
            AssignmentExtension.user_id == user_id,
            AssignmentExtension.assignment_id.in_(assignment_ids),
        )
    )
    return list(result.scalars().all())


async def upsert_assignment_extension(
    db: AsyncSession,
    *,
    assignment_id: int,
    user_id: int,
    extended_due_date: datetime,
) -> AssignmentExtension:
    existing = await get_assignment_extension(db, assignment_id=assignment_id, user_id=user_id)
    if existing is None:
        extension = AssignmentExtension(
            assignment_id=assignment_id,
            user_id=user_id,
            extended_due_date=extended_due_date,
        )
        db.add(extension)
        await db.commit()
        await db.refresh(extension)
        return extension

    existing.extended_due_date = extended_due_date
    await db.commit()
    await db.refresh(existing)
    return existing


async def delete_assignment_extension(
    db: AsyncSession, *, extension: AssignmentExtension
) -> None:
    await db.delete(extension)
    await db.commit()
