from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.module import Module


def _normalize_insert_position(*, desired_position: int | None, item_count: int) -> int:
    if desired_position is None or desired_position <= 0:
        return item_count + 1
    return min(desired_position, item_count + 1)


async def _load_modules_for_reorder(db: AsyncSession, *, course_id: int) -> list[Module]:
    result = await db.execute(
        select(Module)
        .where(Module.course_id == course_id)
        .order_by(Module.position, Module.id)
        .with_for_update()
    )
    return list(result.scalars().all())


def _apply_reorder(
    modules: list[Module],
    *,
    moving_module_id: int | None,
    desired_position: int | None,
) -> None:
    if not modules:
        return

    if moving_module_id is None:
        for idx, m in enumerate(modules):
            m.position = idx + 1
        return

    moving = next((m for m in modules if m.id == moving_module_id), None)
    if moving is None:
        for idx, m in enumerate(modules):
            m.position = idx + 1
        return

    modules_wo = [m for m in modules if m.id != moving_module_id]
    insert_pos = _normalize_insert_position(desired_position=desired_position, item_count=len(modules_wo))
    insert_idx = insert_pos - 1
    modules_wo.insert(insert_idx, moving)

    for idx, m in enumerate(modules_wo):
        m.position = idx + 1


async def create_module(db: AsyncSession, *, course_id: int, title: str, position: int = 0) -> Module:
    module = Module(course_id=course_id, title=title.strip(), position=0)
    db.add(module)
    await db.flush()

    modules = await _load_modules_for_reorder(db, course_id=course_id)
    _apply_reorder(modules, moving_module_id=module.id, desired_position=position)

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
        modules = await _load_modules_for_reorder(db, course_id=module.course_id)
        _apply_reorder(modules, moving_module_id=module.id, desired_position=position)

    await db.commit()
    await db.refresh(module)
    return module


async def delete_module(db: AsyncSession, *, module: Module) -> None:
    course_id = module.course_id
    await db.delete(module)
    await db.flush()
    modules = await _load_modules_for_reorder(db, course_id=course_id)
    _apply_reorder(modules, moving_module_id=None, desired_position=None)
    await db.commit()
