from datetime import datetime

from pydantic import BaseModel


class InviteStatus(BaseModel):
    status: str  # "valid" | "expired" | "used"


class InvitePreviewResponse(BaseModel):
    status: str  # "valid" | "expired" | "used"
    expires_at: datetime
    organization_name: str | None = None
    course_id: int | None = None
    course_code: str | None = None
    course_title: str | None = None

