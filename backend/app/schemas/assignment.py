from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from app.schemas.late_policy import LatePolicy


class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    module_id: int | None = None
    due_date: datetime | None = None
    max_points: int = Field(default=100, ge=0, le=1_000_000)
    late_policy: LatePolicy | None = None


class AssignmentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    module_id: int | None = None
    due_date: datetime | None = None
    max_points: int | None = Field(default=None, ge=0, le=1_000_000)
    late_policy: LatePolicy | None = None


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    module_id: int | None
    title: str
    description: str | None
    due_date: datetime | None
    max_points: int
    late_policy: dict | None
