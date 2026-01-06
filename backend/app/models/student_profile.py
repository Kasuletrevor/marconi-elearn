from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class StudentProfile(Base):
    __tablename__ = "student_profiles"

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), primary_key=True)
    full_name: Mapped[str] = mapped_column(String(200))
    programme: Mapped[str] = mapped_column(String(200))

