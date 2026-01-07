from pydantic import BaseModel, ConfigDict, EmailStr, Field

from app.models.organization_membership import OrgRole


class OrgMembershipCreate(BaseModel):
    user_id: int
    role: OrgRole


class OrgMembershipUpdate(BaseModel):
    role: OrgRole | None = Field(default=None)


class OrgMembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    organization_id: int
    user_id: int
    user_email: EmailStr | None = None
    role: OrgRole
