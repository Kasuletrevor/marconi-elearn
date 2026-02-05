from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from app.schemas.late_policy import LatePolicy


class CourseCreate(BaseModel):
    organization_id: int
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    semester: str | None = Field(default=None, max_length=50)
    year: int | None = Field(default=None, ge=2000, le=2100)
    late_policy: LatePolicy | None = None


class CourseCreateInOrg(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    semester: str | None = Field(default=None, max_length=50)
    year: int | None = Field(default=None, ge=2000, le=2100)
    late_policy: LatePolicy | None = None


class CourseUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    semester: str | None = Field(default=None, max_length=50)
    year: int | None = Field(default=None, ge=2000, le=2100)
    late_policy: LatePolicy | None = None
    self_enroll_enabled: bool | None = None
    regenerate_self_enroll_code: bool | None = None
    github_classroom_id: int | None = None
    github_classroom_name: str | None = Field(default=None, max_length=200)


class CourseOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    code: str
    title: str
    description: str | None
    semester: str | None
    year: int | None
    late_policy: dict | None
    self_enroll_enabled: bool
    github_classroom_id: int | None
    github_classroom_name: str | None
    created_at: datetime
    updated_at: datetime


class CourseStaffOut(CourseOut):
    self_enroll_code: str | None
