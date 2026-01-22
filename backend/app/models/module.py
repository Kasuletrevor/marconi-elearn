from sqlalchemy import ForeignKey, Integer, String, UniqueConstraint
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class Module(Base):
    __tablename__ = "modules"
    __table_args__ = (
        UniqueConstraint(
            "course_id",
            "position",
            name="uq_modules_course_id_position",
            deferrable=True,
            initially="DEFERRED",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    title: Mapped[str] = mapped_column(String(200))
    position: Mapped[int] = mapped_column(Integer, default=0)
