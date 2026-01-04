from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.module import Module


async def create_module(db: AsyncSession, *, course_id: int, title: str, position: int = 0) -> Module:
    module = Module(course_id=course_id, title=title.strip(), position=position)
    db.add(module)
    await db.commit()
    await db.refresh(module)
    return module


async def list_modules(
    db: AsyncSession,
    *,
    course_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[Module]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(
        select(Module).where(Module.course_id == course_id).order_by(Module.position, Module.id).offset(offset).limit(limit)
    )
    return list(result.scalars().all())


async def get_module(db: AsyncSession, *, module_id: int) -> Module | None:
    return await db.get(Module, module_id)


async def update_module(
    db: AsyncSession,
    *,
    module: Module,
    title: str | None,
    position: int | None,
) -> Module:
    if title is not None:
        module.title = title.strip()
    if position is not None:
        module.position = position
    await db.commit()
    await db.refresh(module)
    return module


async def delete_module(db: AsyncSession, *, module: Module) -> None:
    await db.delete(module)
    await db.commit()

