from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.notification import NotificationKind


class NotificationOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    kind: NotificationKind
    title: str
    body: str | None
    link_url: str | None
    read_at: datetime | None
    created_at: datetime

