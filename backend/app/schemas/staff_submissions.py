from __future__ import annotations

from enum import Enum

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


class StaffSubmissionsPage(BaseModel):
    items: list[StaffSubmissionQueueItem]
    total: int
    offset: int
    limit: int


class StaffSubmissionBulkAction(str, Enum):
    mark_pending = "mark_pending"
    mark_grading = "mark_grading"
    mark_graded = "mark_graded"


class StaffSubmissionsBulkRequest(BaseModel):
    submission_ids: list[int] = Field(min_length=1, max_length=200)
    action: StaffSubmissionBulkAction


class StaffSubmissionsBulkResult(BaseModel):
    updated_ids: list[int]
    skipped_ids: list[int]


class StaffNextSubmissionOut(BaseModel):
    submission_id: int | None
