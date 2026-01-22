from datetime import datetime
import enum

from sqlalchemy import Boolean, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GradingPhase(str, enum.Enum):
    practice = "practice"
    final = "final"


class SubmissionTestResult(Base):
    __tablename__ = "submission_test_results"

    id: Mapped[int] = mapped_column(primary_key=True)
    submission_id: Mapped[int] = mapped_column(
        ForeignKey("submissions.id", ondelete="CASCADE"), index=True
    )
    test_case_id: Mapped[int] = mapped_column(
        ForeignKey("test_cases.id", ondelete="CASCADE"), index=True
    )
    phase: Mapped[GradingPhase] = mapped_column(
        String(20),
        nullable=False,
        default=GradingPhase.practice.value,
    )
    passed: Mapped[bool] = mapped_column(Boolean, nullable=False)
    outcome: Mapped[int] = mapped_column(Integer, nullable=False)
    compile_output: Mapped[str] = mapped_column(Text, default="")
    stdout: Mapped[str] = mapped_column(Text, default="")
    stderr: Mapped[str] = mapped_column(Text, default="")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
