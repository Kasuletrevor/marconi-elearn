from pydantic import BaseModel, ConfigDict

from app.models.course_membership import CourseRole


class CourseMembershipCreate(BaseModel):
    user_id: int
    role: CourseRole


class CourseMembershipUpdate(BaseModel):
    role: CourseRole | None = None


class CourseMembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    user_id: int
    role: CourseRole
