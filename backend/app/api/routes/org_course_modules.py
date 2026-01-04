from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.courses import get_course
from app.crud.modules import create_module, delete_module, get_module, list_modules, update_module
from app.db.deps import get_db
from app.schemas.module import ModuleCreate, ModuleOut, ModuleUpdate

router = APIRouter(
    prefix="/orgs/{org_id}/courses/{course_id}/modules",
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)


async def _require_course_in_org(db: AsyncSession, *, org_id: int, course_id: int) -> None:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")


@router.post("", response_model=ModuleOut, status_code=status.HTTP_201_CREATED)
async def create_module_in_course(
    org_id: int,
    course_id: int,
    payload: ModuleCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ModuleOut:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    return await create_module(db, course_id=course_id, title=payload.title, position=payload.position)


@router.get("", response_model=list[ModuleOut])
async def list_modules_in_course(
    org_id: int,
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[ModuleOut]:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    return await list_modules(db, course_id=course_id, offset=offset, limit=limit)


@router.patch("/{module_id}", response_model=ModuleOut)
async def update_module_in_course(
    org_id: int,
    course_id: int,
    module_id: int,
    payload: ModuleUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> ModuleOut:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    module = await get_module(db, module_id=module_id)
    if module is None or module.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    return await update_module(db, module=module, title=payload.title, position=payload.position)


@router.delete("/{module_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_module_in_course(
    org_id: int,
    course_id: int,
    module_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    await _require_course_in_org(db, org_id=org_id, course_id=course_id)
    module = await get_module(db, module_id=module_id)
    if module is None or module.course_id != course_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Module not found")
    await delete_module(db, module=module)
    return None

