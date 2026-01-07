from __future__ import annotations

from pydantic import BaseModel, ConfigDict, EmailStr


class MissingSubmissionsSummaryItem(BaseModel):
    assignment_id: int
    assignment_title: str
    total_students: int
    submitted_count: int
    missing_count: int


class MissingStudentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    user_id: int
    email: EmailStr
    full_name: str | None
    programme: str | None
    student_number: str | None

