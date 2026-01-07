from __future__ import annotations

from enum import Enum

from pydantic import BaseModel, Field


class LatePolicyType(str, Enum):
    percent_per_day = "percent_per_day"


class LatePolicy(BaseModel):
    enabled: bool = True
    type: LatePolicyType = LatePolicyType.percent_per_day
    grace_minutes: int = Field(default=0, ge=0, le=7 * 24 * 60)
    percent_per_day: int = Field(default=0, ge=0, le=100)
    max_percent: int = Field(default=100, ge=0, le=100)

