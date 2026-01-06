from __future__ import annotations

from pathlib import Path
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import FileResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_student_or_staff
from app.crud.module_resources import get_module_resource, list_module_resources
from app.crud.modules import get_module
from app.db.deps import get_db
from app.models.module_resource import ModuleResourceKind
from app.models.user import User
from app.schemas.module_resource import ModuleResourceOut

router = APIRouter(prefix="/student", dependencies=[Depends(get_current_user)])


@router.get("/courses/{course_id}/modules/{module_id}/resources", response_model=list[ModuleResourceOut])
async def list_published_resources(
    course_id: int,
    module_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 200,
) -> list[ModuleResourceOut]:
    await require_course_student_or_staff(course_id, current_user, db)
    module = await get_module(db, module_id=module_id)
    if module is None or module.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    return await list_module_resources(db, module_id=module_id, published_only=True, offset=offset, limit=limit)


@router.get("/resources/{resource_id}/download")
async def download_published_resource(
    resource_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> FileResponse:
    resource = await get_module_resource(db, resource_id=resource_id)
    if resource is None or not resource.is_published:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    if resource.kind != ModuleResourceKind.file or not resource.storage_path or not resource.file_name:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Resource is not a file")

    module = await get_module(db, module_id=resource.module_id)
    if module is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Resource not found")
    await require_course_student_or_staff(module.course_id, current_user, db)

    path = Path(resource.storage_path)
    if not path.exists():
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return FileResponse(path=path, filename=resource.file_name, media_type=resource.content_type or "application/octet-stream")

