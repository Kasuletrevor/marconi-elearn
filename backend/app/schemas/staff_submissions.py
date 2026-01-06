from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, EmailStr, Field

from app.models.submission import SubmissionStatus


class StaffSubmissionQueueItem(BaseModel):
    id: int
    course_id: int
    course_code: str
    course_title: str
    assignment_id: int
    assignment_title: str
    max_points: int

    student_user_id: int
    student_email: EmailStr
    student_full_name: str | None
    student_programme: str | None
    student_number: str | None

    file_name: str
    submitted_at: datetime
    status: SubmissionStatus
    score: int | None
    feedback: str | None


class StaffSubmissionDetail(StaffSubmissionQueueItem):
    content_type: str | None
    size_bytes: int


class StaffSubmissionUpdate(BaseModel):
    status: SubmissionStatus | None = None
    score: int | None = Field(default=None, ge=0, le=1_000_000)
    feedback: str | None = Field(default=None, max_length=10_000)

