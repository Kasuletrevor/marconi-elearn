from datetime import datetime

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment


async def create_assignment(
    db: AsyncSession,
    *,
    course_id: int,
    module_id: int | None,
    title: str,
    description: str | None,
    due_date: datetime | None,
    max_points: int,
    late_policy: dict | None = None,
) -> Assignment:
    assignment = Assignment(
        course_id=course_id,
        module_id=module_id,
        title=title.strip(),
        description=description.strip() if description else None,
        due_date=due_date,
        max_points=max_points,
        late_policy=late_policy,
    )
    db.add(assignment)
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def list_assignments(
    db: AsyncSession,
    *,
    course_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[Assignment]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(Assignment)
        .where(Assignment.course_id == course_id)
        .order_by(Assignment.id)
        .offset(offset)
        .limit(limit)
    )
    return list(result.scalars().all())


async def get_assignment(db: AsyncSession, *, assignment_id: int) -> Assignment | None:
    return await db.get(Assignment, assignment_id)


async def update_assignment(
    db: AsyncSession,
    *,
    assignment: Assignment,
    title: str | None,
    description: str | None,
    module_id: int | None,
    due_date: datetime | None,
    max_points: int | None,
    late_policy: dict | None,
) -> Assignment:
    if title is not None:
        assignment.title = title.strip()
    if description is not None:
        assignment.description = description.strip() if description else None
    if module_id is not None:
        assignment.module_id = module_id
    if due_date is not None:
        assignment.due_date = due_date
    if max_points is not None:
        assignment.max_points = max_points
    if late_policy is not None:
        assignment.late_policy = late_policy
    await db.commit()
    await db.refresh(assignment)
    return assignment


async def delete_assignment(db: AsyncSession, *, assignment: Assignment) -> None:
    await db.delete(assignment)
    await db.commit()
