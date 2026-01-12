from __future__ import annotations

from sqlalchemy import Boolean, ForeignKey, Index, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.sql.sqltypes import DateTime

from app.db.base import Base


class CourseNotificationPreference(Base):
    __tablename__ = "course_notification_preferences"
    __table_args__ = (
        UniqueConstraint(
            "course_id", "user_id", name="uq_course_notification_preference"
        ),
        Index(
            "ix_course_notification_preferences_course_user",
            "course_id",
            "user_id",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"), index=True
    )

    notify_new_submissions: Mapped[bool] = mapped_column(
        Boolean(), nullable=False, server_default="true"
    )

    created_at: Mapped[DateTime] = mapped_column(
        DateTime(timezone=True), nullable=False, server_default=func.now()
    )

