from __future__ import annotations

from sqlalchemy import ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class PlagiarismPair(Base):
    __tablename__ = "plagiarism_pairs"

    id: Mapped[int] = mapped_column(primary_key=True)
    run_id: Mapped[int] = mapped_column(
        ForeignKey("plagiarism_runs.id", ondelete="CASCADE"), index=True
    )
    student_a_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    student_b_user_id: Mapped[int] = mapped_column(ForeignKey("users.id", ondelete="CASCADE"))
    submission_a_id: Mapped[int | None] = mapped_column(
        ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True
    )
    submission_b_id: Mapped[int | None] = mapped_column(
        ForeignKey("submissions.id", ondelete="SET NULL"), nullable=True
    )
    similarity_pct: Mapped[int] = mapped_column(Integer)
    lines_matched: Mapped[int | None] = mapped_column(Integer, nullable=True)
    moss_match_url: Mapped[str | None] = mapped_column(String(500), nullable=True)
