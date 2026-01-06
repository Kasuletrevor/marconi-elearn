from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

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

