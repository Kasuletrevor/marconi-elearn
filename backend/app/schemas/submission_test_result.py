from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubmissionTestResultOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    submission_id: int
    test_case_id: int
    passed: bool
    outcome: int
    compile_output: str
    stdout: str
    stderr: str
    created_at: datetime

