import enum

from sqlalchemy import Enum, ForeignKey, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class OrgRole(str, enum.Enum):
    admin = "admin"
    lecturer = "lecturer"
    ta = "ta"


class OrganizationMembership(Base):
    __tablename__ = "organization_memberships"
    __table_args__ = (UniqueConstraint("organization_id", "user_id", name="uq_org_membership"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"))
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    role: Mapped[OrgRole] = mapped_column(Enum(OrgRole, name="org_role"), index=True)

    organization = relationship("Organization")
    user = relationship("User")

    @property
    def user_email(self) -> str | None:
        user = getattr(self, "user", None)
        return getattr(user, "email", None)
