from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, Index, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GradingEvent(Base):
    __tablename__ = "grading_events"
    __table_args__ = (
        Index("ix_grading_events_phase_event_type", "phase", "event_type"),
        Index("ix_grading_events_created_at", "created_at"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int | None] = mapped_column(
        ForeignKey("submissions.id", ondelete="SET NULL"),
        index=True,
        nullable=True,
    )
    phase: Mapped[str] = mapped_column(String(16), index=True)
    event_type: Mapped[str] = mapped_column(String(32), index=True)
    attempt: Mapped[int] = mapped_column(Integer, default=0)
    reason: Mapped[str | None] = mapped_column(String(64), default=None, index=True)
    context: Mapped[str | None] = mapped_column(String(64), default=None)
    duration_ms: Mapped[int | None] = mapped_column(Integer, default=None)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
