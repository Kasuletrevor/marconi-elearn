from pydantic import BaseModel, EmailStr, Field

from app.models.course_membership import CourseRole


class LoginRequest(BaseModel):
    email: EmailStr
    password: str = Field(min_length=1, max_length=128)


class AcceptInviteRequest(BaseModel):
    token: str = Field(min_length=10, max_length=500)
    password: str = Field(min_length=8, max_length=128)


class CourseRoleItem(BaseModel):
    course_id: int
    role: CourseRole


class MeResponse(BaseModel):
    id: int
    email: EmailStr
    is_superadmin: bool = False
    org_admin_of: list[int] = Field(default_factory=list)
    course_roles: list[CourseRoleItem] = Field(default_factory=list)
