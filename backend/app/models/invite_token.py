from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class InviteToken(Base):
    __tablename__ = "invite_tokens"

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(ForeignKey("organizations.id", ondelete="CASCADE"), index=True)
    course_id: Mapped[int | None] = mapped_column(ForeignKey("courses.id", ondelete="CASCADE"), index=True)
    email: Mapped[str] = mapped_column(String(320), index=True)
    full_name: Mapped[str | None] = mapped_column(String(200), nullable=True)
    student_number: Mapped[str | None] = mapped_column(String(50), nullable=True)
    programme: Mapped[str | None] = mapped_column(String(200), nullable=True)
    token_hash: Mapped[str] = mapped_column(String(64), unique=True, index=True)
    expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    used_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True, index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
