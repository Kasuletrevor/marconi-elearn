from datetime import datetime

from sqlalchemy import DateTime, String
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    email: Mapped[str] = mapped_column(String(320), unique=True, index=True)
    password_hash: Mapped[str | None] = mapped_column(String(256), nullable=True)

    github_user_id: Mapped[int | None] = mapped_column(nullable=True, index=True)
    github_login: Mapped[str | None] = mapped_column(String(200), nullable=True)
    github_connected_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
