from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.crud.notifications import list_notifications, mark_notification_read
from app.db.deps import get_db
from app.models.notification import Notification
from app.models.user import User
from app.schemas.notification import NotificationOut

router = APIRouter(prefix="/student", dependencies=[Depends(get_current_user)])


@router.get("/notifications", response_model=list[NotificationOut])
async def my_notifications(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    unread_only: bool = False,
    offset: int = 0,
    limit: int = 100,
) -> list[NotificationOut]:
    return await list_notifications(db, user_id=current_user.id, unread_only=unread_only, offset=offset, limit=limit)


@router.post("/notifications/{notification_id}/read", response_model=NotificationOut)
async def read_notification(
    notification_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> NotificationOut:
    notification = await db.get(Notification, notification_id)
    if notification is None or notification.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found")
    return await mark_notification_read(db, notification=notification)

