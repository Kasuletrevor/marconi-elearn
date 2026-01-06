from __future__ import annotations

from pathlib import Path
from typing import Annotated
from uuid import uuid4

from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.courses import get_course
from app.crud.module_resources import (
    create_file_resource,
    create_link_resource,
    delete_module_resource,
    get_module_resource,
    list_module_resources,
    update_module_resource,
)
from app.crud.modules import get_module
from app.db.deps import get_db
from app.models.module_resource import ModuleResourceKind
from app.models.user import User
from app.schemas.module_resource import ModuleResourceCreateLink, ModuleResourceOut, ModuleResourceUpdate

router = APIRouter(prefix="/staff/courses/{course_id}/modules/{module_id}/resources", dependencies=[Depends(get_current_user)])

_MAX_UPLOAD_BYTES = 15 * 1024 * 1024


def _resources_root() -> Path:
    root = Path(__file__).resolve().parents[3] / "var" / "resources"
    root.mkdir(parents=True, exist_ok=True)
    return root


async def _require_course_and_module(db: AsyncSession, *, course_id: int, module_id: int) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    module = await get_module(db, module_id=module_id)
    if module is None or module.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")


@router.get("", response_model=list[ModuleResourceOut])
async def list_resources(
    course_id: int,
    module_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 200,
) -> list[ModuleResourceOut]:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_module(db, course_id=course_id, module_id=module_id)
    return await list_module_resources(db, module_id=module_id, published_only=False, offset=offset, limit=limit)


@router.post("/link", response_model=ModuleResourceOut, status_code=status.HTTP_201_CREATED)
async def create_link(
    course_id: int,
    module_id: int,
    payload: ModuleResourceCreateLink,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ModuleResourceOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_module(db, course_id=course_id, module_id=module_id)
    return await create_link_resource(
        db,
        module_id=module_id,
        title=payload.title,
        url=str(payload.url),
        position=payload.position,
        is_published=payload.is_published,
    )


@router.post("/file", response_model=ModuleResourceOut, status_code=status.HTTP_201_CREATED)
async def upload_file(
    course_id: int,
    module_id: int,
    title: Annotated[str, Form(min_length=1, max_length=200)],
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    position: Annotated[int, Form()] = 0,
    is_published: Annotated[bool, Form()] = False,
) -> ModuleResourceOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_module(db, course_id=course_id, module_id=module_id)

    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Missing filename")

    data = await file.read()
    if len(data) > _MAX_UPLOAD_BYTES:
        raise HTTPException(status_code=status.HTTP_413_REQUEST_ENTITY_TOO_LARGE, detail="File too large")

    ext = Path(file.filename).suffix.lower()
    dest = _resources_root() / f"{uuid4().hex}{ext}"
    dest.write_bytes(data)

    return await create_file_resource(
        db,
        module_id=module_id,
        title=title,
        file_name=file.filename,
        content_type=file.content_type,
        size_bytes=len(data),
        storage_path=str(dest),
        position=position,
        is_published=is_published,
    )


@router.patch("/{resource_id}", response_model=ModuleResourceOut)
async def update_resource(
    course_id: int,
    module_id: int,
    resource_id: int,
    payload: ModuleResourceUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> ModuleResourceOut:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_module(db, course_id=course_id, module_id=module_id)
    resource = await get_module_resource(db, resource_id=resource_id)
    if resource is None or resource.module_id != module_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    return await update_module_resource(
        db,
        resource=resource,
        title=payload.title,
        url=str(payload.url) if payload.url is not None else None,
        position=payload.position,
        is_published=payload.is_published,
    )


@router.delete("/{resource_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_resource(
    course_id: int,
    module_id: int,
    resource_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> None:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_module(db, course_id=course_id, module_id=module_id)
    resource = await get_module_resource(db, resource_id=resource_id)
    if resource is None or resource.module_id != module_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    await delete_module_resource(db, resource=resource)
    return None


@router.get("/{resource_id}/download")
async def download_resource(
    course_id: int,
    module_id: int,
    resource_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    await require_course_staff(course_id, current_user, db)
    await _require_course_and_module(db, course_id=course_id, module_id=module_id)
    resource = await get_module_resource(db, resource_id=resource_id)
    if resource is None or resource.module_id != module_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if resource.kind != ModuleResourceKind.file or not resource.storage_path or not resource.file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource is not a file")
    path = Path(resource.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(path=path, filename=resource.file_name, media_type=resource.content_type or "application/octet-stream")

