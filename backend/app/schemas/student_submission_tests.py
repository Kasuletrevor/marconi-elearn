from __future__ import annotations

from pydantic import BaseModel


class StudentVisibleTestResultOut(BaseModel):
    test_case_id: int
    name: str
    position: int
    points: int
    passed: bool
    outcome: int
    stdin: str
    expected_stdout: str
    expected_stderr: str
    stdout: str
    stderr: str


class StudentSubmissionTestsOut(BaseModel):
    submission_id: int
    compile_output: str
    tests: list[StudentVisibleTestResultOut]

