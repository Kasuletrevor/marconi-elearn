"""Request/response schemas for plagiarism detection."""

from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, Field


class StartPlagiarismRunRequest(BaseModel):
    language: Literal["c", "cc"] = Field(
        default="c",
        description="MOSS language: 'c' or 'cc' (C++)",
    )


class PlagiarismRunOut(BaseModel):
    id: int
    course_id: int
    assignment_id: int
    initiated_by_user_id: int
    status: str
    moss_report_url: str | None = None
    error_message: str | None = None
    pair_count: int | None = None
    created_at: datetime
    completed_at: datetime | None = None


class PlagiarismPairOut(BaseModel):
    id: int
    run_id: int
    student_a_user_id: int
    student_a_email: str | None = None
    student_b_user_id: int
    student_b_email: str | None = None
    similarity_pct: int
    lines_matched: int | None = None
    moss_match_url: str | None = None
