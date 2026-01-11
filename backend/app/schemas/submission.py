from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.submission import SubmissionStatus


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    user_id: int
    file_name: str
    file_path: str
    content_type: str | None
    size_bytes: int
    created_at: datetime
    submitted_at: datetime
    status: SubmissionStatus
    score: int | None
    feedback: str | None


class SubmissionStudentOut(BaseModel):
    id: int
    assignment_id: int
    user_id: int
    file_name: str
    file_path: str
    content_type: str | None
    size_bytes: int
    created_at: datetime
    submitted_at: datetime
    status: SubmissionStatus
    score: int | None
    feedback: str | None
    error_kind: str | None = None

    effective_due_date: datetime | None
    late_seconds: int | None
    late_penalty_percent: int | None
