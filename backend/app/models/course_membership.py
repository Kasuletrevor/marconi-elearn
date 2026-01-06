import enum

from sqlalchemy import Enum, ForeignKey, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class CourseRole(str, enum.Enum):
    owner = "owner"
    co_lecturer = "co_lecturer"
    ta = "ta"
    student = "student"


class CourseMembership(Base):
    __tablename__ = "course_memberships"
    __table_args__ = (UniqueConstraint("course_id", "user_id", name="uq_course_membership"),)

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    role: Mapped[CourseRole] = mapped_column(Enum(CourseRole, name="course_role"), index=True)
    student_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
