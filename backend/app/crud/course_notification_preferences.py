from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course_notification_preference import CourseNotificationPreference


async def get_course_notification_preference(
    db: AsyncSession, *, course_id: int, user_id: int
) -> CourseNotificationPreference | None:
    result = await db.execute(
        select(CourseNotificationPreference).where(
            CourseNotificationPreference.course_id == course_id,
            CourseNotificationPreference.user_id == user_id,
        )
    )
    return result.scalars().first()


async def set_course_notify_new_submissions(
    db: AsyncSession, *, course_id: int, user_id: int, enabled: bool
) -> CourseNotificationPreference:
    pref = await get_course_notification_preference(
        db, course_id=course_id, user_id=user_id
    )
    if pref is None:
        pref = CourseNotificationPreference(
            course_id=course_id,
            user_id=user_id,
            notify_new_submissions=enabled,
        )
        db.add(pref)
    else:
        pref.notify_new_submissions = enabled
    await db.commit()
    await db.refresh(pref)
    return pref

