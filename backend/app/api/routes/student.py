from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_student_or_staff
from app.crud.student_views import list_course_assignments, list_course_modules, list_my_courses
from app.db.deps import get_db
from app.models.user import User
from app.schemas.assignment import AssignmentOut
from app.schemas.course import CourseOut
from app.schemas.module import ModuleOut

router = APIRouter(prefix="/student", dependencies=[Depends(get_current_user)])


@router.get("/courses", response_model=list[CourseOut])
async def my_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[CourseOut]:
    return await list_my_courses(db, user_id=current_user.id, offset=offset, limit=limit)


@router.get("/courses/{course_id}/modules", response_model=list[ModuleOut])
async def course_modules(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[ModuleOut]:
    await require_course_student_or_staff(course_id, current_user, db)
    return await list_course_modules(db, course_id=course_id, offset=offset, limit=limit)


@router.get("/courses/{course_id}/assignments", response_model=list[AssignmentOut])
async def course_assignments(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[AssignmentOut]:
    await require_course_student_or_staff(course_id, current_user, db)
    return await list_course_assignments(db, course_id=course_id, offset=offset, limit=limit)

