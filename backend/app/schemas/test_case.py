from __future__ import annotations

from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field

TestCaseComparisonMode = Literal["trim", "exact", "ignore_whitespace", "ignore_case"]


class TestCaseCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    position: int = Field(default=1, ge=1, le=10_000)
    points: int = Field(default=0, ge=0, le=1_000_000)
    is_hidden: bool = True
    stdin: str = Field(default="", max_length=200_000)
    expected_stdout: str = Field(default="", max_length=200_000)
    expected_stderr: str = Field(default="", max_length=200_000)
    comparison_mode: TestCaseComparisonMode = "trim"


class TestCaseUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=200)
    position: int | None = Field(default=None, ge=1, le=10_000)
    points: int | None = Field(default=None, ge=0, le=1_000_000)
    is_hidden: bool | None = None
    stdin: str | None = Field(default=None, max_length=200_000)
    expected_stdout: str | None = Field(default=None, max_length=200_000)
    expected_stderr: str | None = Field(default=None, max_length=200_000)
    comparison_mode: TestCaseComparisonMode | None = None


class TestCaseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    name: str
    position: int
    points: int
    is_hidden: bool
    stdin: str
    expected_stdout: str
    expected_stderr: str
    comparison_mode: TestCaseComparisonMode
    created_at: datetime
