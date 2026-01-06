from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel

from app.models.submission import SubmissionStatus


class StudentSubmissionItem(BaseModel):
    id: int
    course_id: int
    course_code: str
    course_title: str
    assignment_id: int
    assignment_title: str
    max_points: int

    submitted_at: datetime
    status: SubmissionStatus
    score: int | None
    feedback: str | None


class StudentSubmissionDownloadMeta(BaseModel):
    id: int
    file_name: str
    content_type: str | None
    size_bytes: int
    created_at: datetime
