from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_instructor, require_course_staff
from app.crud.course_notification_preferences import (
    get_course_notification_preference,
    set_course_notify_new_submissions,
)
from app.crud.courses import UNSET, get_course, set_course_self_enroll, update_course
from app.crud.staff_courses import list_staff_courses
from app.db.deps import get_db
from app.models.user import User
from app.schemas.course_notification_preferences import (
    CourseNotificationPreferencesOut,
    CourseNotificationPreferencesUpdate,
)
from app.schemas.course import CourseOut, CourseStaffOut, CourseUpdate

router = APIRouter(prefix="/staff/courses", dependencies=[Depends(get_current_user)])


@router.get("", response_model=list[CourseOut])
async def list_my_staff_courses(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[CourseOut]:
    return await list_staff_courses(db, user_id=current_user.id, offset=offset, limit=limit)


@router.get("/{course_id}", response_model=CourseStaffOut)
async def get_staff_course(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseStaffOut:
    await require_course_staff(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    return course


@router.patch("/{course_id}", response_model=CourseStaffOut)
async def update_staff_course(
    course_id: int,
    payload: CourseUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseStaffOut:
    await require_course_instructor(course_id, current_user, db)
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    fields = payload.model_fields_set

    updated = await update_course(
        db,
        course=course,
        code=payload.code if "code" in fields else UNSET,
        title=payload.title if "title" in fields else UNSET,
        description=payload.description if "description" in fields else UNSET,
        semester=payload.semester if "semester" in fields else UNSET,
        year=payload.year if "year" in fields else UNSET,
        late_policy=(
            payload.late_policy.model_dump() if payload.late_policy is not None else None
        )
        if "late_policy" in fields
        else UNSET,
        self_enroll_enabled=payload.self_enroll_enabled if "self_enroll_enabled" in fields else UNSET,
    )

    if payload.regenerate_self_enroll_code:
        updated = await set_course_self_enroll(db, course=updated, regenerate_code=True)
    elif "self_enroll_enabled" in fields:
        updated = await set_course_self_enroll(db, course=updated, enabled=bool(payload.self_enroll_enabled))

    return updated


@router.get("/{course_id}/notification-preferences", response_model=CourseNotificationPreferencesOut)
async def get_my_course_notification_preferences(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseNotificationPreferencesOut:
    await require_course_staff(course_id, current_user, db)
    pref = await get_course_notification_preference(
        db, course_id=course_id, user_id=current_user.id
    )
    return CourseNotificationPreferencesOut(
        course_id=course_id,
        notify_new_submissions=(
            True if pref is None else bool(pref.notify_new_submissions)
        ),
    )


@router.patch("/{course_id}/notification-preferences", response_model=CourseNotificationPreferencesOut)
async def update_my_course_notification_preferences(
    course_id: int,
    payload: CourseNotificationPreferencesUpdate,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseNotificationPreferencesOut:
    await require_course_staff(course_id, current_user, db)
    pref = await set_course_notify_new_submissions(
        db,
        course_id=course_id,
        user_id=current_user.id,
        enabled=bool(payload.notify_new_submissions),
    )
    return CourseNotificationPreferencesOut(
        course_id=course_id,
        notify_new_submissions=bool(pref.notify_new_submissions),
    )
