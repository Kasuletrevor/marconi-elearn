from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class AssignmentExtension(Base):
    __tablename__ = "assignment_extensions"
    __table_args__ = (
        UniqueConstraint("assignment_id", "user_id", name="uq_assignment_extension_assignment_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    assignment_id: Mapped[int] = mapped_column(
        ForeignKey("assignments.id", ondelete="CASCADE"), index=True
    )
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"), index=True)
    extended_due_date: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

