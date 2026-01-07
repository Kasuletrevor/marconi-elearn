from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field
from app.schemas.late_policy import LatePolicy


class CourseCreate(BaseModel):
    organization_id: int
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    semester: str | None = Field(default=None, max_length=50)
    year: int | None = None
    late_policy: LatePolicy | None = None


class CourseCreateInOrg(BaseModel):
    code: str = Field(min_length=1, max_length=50)
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    semester: str | None = Field(default=None, max_length=50)
    year: int | None = None
    late_policy: LatePolicy | None = None


class CourseUpdate(BaseModel):
    code: str | None = Field(default=None, min_length=1, max_length=50)
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=2000)
    semester: str | None = Field(default=None, max_length=50)
    year: int | None = None
    late_policy: LatePolicy | None = None


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
    created_at: datetime
    updated_at: datetime
