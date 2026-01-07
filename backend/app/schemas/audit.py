from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class AuditEventOut(BaseModel):
    id: int
    organization_id: int | None
    actor_user_id: int | None
    actor_email: str | None
    action: str
    target_type: str | None
    target_id: int | None
    metadata: dict | None
    created_at: datetime

