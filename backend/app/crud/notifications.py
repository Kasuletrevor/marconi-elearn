from __future__ import annotations

from datetime import datetime, timedelta, timezone
import re

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.course_notification_preferences import get_course_notification_preference
from app.models.course_membership import CourseMembership, CourseRole
from app.models.notification import Notification, NotificationKind


async def create_notification(
    db: AsyncSession,
    *,
    user_id: int,
    kind: NotificationKind,
    title: str,
    body: str | None,
    link_url: str | None,
) -> Notification:
    n = Notification(user_id=user_id, kind=kind, title=title, body=body, link_url=link_url)
    db.add(n)
    await db.commit()
    await db.refresh(n)
    return n


async def list_notifications(
    db: AsyncSession,
    *,
    user_id: int,
    unread_only: bool,
    offset: int = 0,
    limit: int = 100,
) -> list[Notification]:
    offset = max(0, offset)
    limit = min(max(1, limit), 200)
    stmt = select(Notification).where(Notification.user_id == user_id).order_by(Notification.id.desc())
    if unread_only:
        stmt = stmt.where(Notification.read_at.is_(None))
    result = await db.execute(stmt.offset(offset).limit(limit))
    return list(result.scalars().all())


async def mark_notification_read(db: AsyncSession, *, notification: Notification) -> Notification:
    notification.read_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(notification)
    return notification


_COUNT_RE = re.compile(r"\((\d+)\)")


def _parse_count_from_title(title: str) -> int:
    match = _COUNT_RE.search(title)
    if match is None:
        return 0
    try:
        return int(match.group(1))
    except ValueError:
        return 0


async def notify_staff_new_submission_digest(
    db: AsyncSession,
    *,
    course_id: int,
    course_code: str,
    assignment_title: str,
    student_email: str,
    submitter_user_id: int,
) -> None:
    """
    Create/update a per-course "new submissions" digest notification for each
    course staff member, grouped within a 10-minute window.
    """

    staff_roles = [CourseRole.owner, CourseRole.co_lecturer, CourseRole.ta]
    result = await db.execute(
        select(CourseMembership.user_id).where(
            CourseMembership.course_id == course_id,
            CourseMembership.role.in_(staff_roles),
        )
    )
    staff_user_ids = sorted({int(uid) for (uid,) in result.all()})
    if not staff_user_ids:
        return

    # Don't notify the submitter if they happen to be staff too.
    staff_user_ids = [uid for uid in staff_user_ids if uid != submitter_user_id]
    if not staff_user_ids:
        return

    enabled_user_ids: list[int] = []
    for staff_user_id in staff_user_ids:
        pref = await get_course_notification_preference(
            db, course_id=course_id, user_id=staff_user_id
        )
        if pref is not None and pref.notify_new_submissions is False:
            continue
        enabled_user_ids.append(staff_user_id)
    if not enabled_user_ids:
        return

    now = datetime.now(timezone.utc)
    cutoff = now - timedelta(minutes=10)
    link_url = f"/staff/submissions?course_id={course_id}"

    existing_result = await db.execute(
        select(Notification).where(
            Notification.user_id.in_(enabled_user_ids),
            Notification.kind == NotificationKind.submissions_received,
            Notification.read_at.is_(None),
            Notification.link_url == link_url,
            Notification.created_at >= cutoff,
        )
    )
    existing_by_user: dict[int, Notification] = {}
    for n in existing_result.scalars().all():
        if n.user_id not in existing_by_user or n.id > existing_by_user[n.user_id].id:
            existing_by_user[n.user_id] = n

    for staff_user_id in enabled_user_ids:
        existing = existing_by_user.get(staff_user_id)
        if existing is None:
            title = f"New submissions (1) — {course_code}"
            body = (
                "1 new submission in the last 10 minutes.\n"
                f"Latest: {student_email} — {assignment_title}"
            )
            db.add(
                Notification(
                    user_id=staff_user_id,
                    kind=NotificationKind.submissions_received,
                    title=title,
                    body=body,
                    link_url=link_url,
                )
            )
            continue

        current_count = _parse_count_from_title(existing.title)
        new_count = max(1, current_count + 1)
        existing.title = f"New submissions ({new_count}) — {course_code}"
        existing.body = (
            f"{new_count} new submissions in the last 10 minutes.\n"
            f"Latest: {student_email} — {assignment_title}"
        )

    await db.commit()
