from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.module_resource import ModuleResource, ModuleResourceKind


async def create_link_resource(
    db: AsyncSession,
    *,
    module_id: int,
    title: str,
    url: str,
    position: int = 0,
    is_published: bool = False,
) -> ModuleResource:
    resource = ModuleResource(
        module_id=module_id,
        kind=ModuleResourceKind.link,
        title=title.strip(),
        url=url,
        position=position,
        is_published=is_published,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


async def create_file_resource(
    db: AsyncSession,
    *,
    module_id: int,
    title: str,
    file_name: str,
    content_type: str | None,
    size_bytes: int,
    storage_path: str,
    position: int = 0,
    is_published: bool = False,
) -> ModuleResource:
    resource = ModuleResource(
        module_id=module_id,
        kind=ModuleResourceKind.file,
        title=title.strip(),
        file_name=file_name,
        content_type=content_type,
        size_bytes=size_bytes,
        storage_path=storage_path,
        position=position,
        is_published=is_published,
    )
    db.add(resource)
    await db.commit()
    await db.refresh(resource)
    return resource


async def list_module_resources(
    db: AsyncSession,
    *,
    module_id: int,
    published_only: bool,
    offset: int = 0,
    limit: int = 200,
) -> list[ModuleResource]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    stmt = select(ModuleResource).where(ModuleResource.module_id == module_id).order_by(
        ModuleResource.position.asc(), ModuleResource.id.asc()
    )
    if published_only:
        stmt = stmt.where(ModuleResource.is_published.is_(True))
    result = await db.execute(stmt.offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_module_resource(db: AsyncSession, *, resource_id: int) -> ModuleResource | None:
    return await db.get(ModuleResource, resource_id)


async def update_module_resource(
    db: AsyncSession,
    *,
    resource: ModuleResource,
    title: str | None,
    url: str | None,
    position: int | None,
    is_published: bool | None,
) -> ModuleResource:
    if title is not None:
        resource.title = title.strip()
    if url is not None:
        resource.url = url
    if position is not None:
        resource.position = position
    if is_published is not None:
        resource.is_published = is_published
    await db.commit()
    await db.refresh(resource)
    return resource


async def delete_module_resource(db: AsyncSession, *, resource: ModuleResource) -> None:
    await db.delete(resource)
    await db.commit()

