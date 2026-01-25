import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Index, String, UniqueConstraint, text
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class CourseRole(str, enum.Enum):
    owner = "owner"
    co_lecturer = "co_lecturer"
    ta = "ta"
    student = "student"


class CourseMembership(Base):
    __tablename__ = "course_memberships"
    __table_args__ = (
        UniqueConstraint("course_id", "user_id", name="uq_course_membership"),
        Index(
            "uq_course_student_number",
            "course_id",
            "student_number",
            unique=True,
            postgresql_where=text("student_number IS NOT NULL"),
        ),
        Index(
            "uq_course_github_user_id",
            "course_id",
            "github_user_id",
            unique=True,
            postgresql_where=text("github_user_id IS NOT NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[CourseRole] = mapped_column(Enum(CourseRole, name="course_role"), index=True)
    student_number: Mapped[str | None] = mapped_column(String(50), nullable=True)

    github_user_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    github_login: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_linked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    github_linked_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )

    user = relationship("User", foreign_keys=[user_id])

    @property
    def user_email(self) -> str | None:
        user = getattr(self, "user", None)
        return getattr(user, "email", None)
