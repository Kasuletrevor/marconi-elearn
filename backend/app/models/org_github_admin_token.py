from datetime import datetime

from sqlalchemy import DateTime, ForeignKey, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class OrgGitHubAdminToken(Base):
    __tablename__ = "org_github_admin_tokens"
    __table_args__ = (
        UniqueConstraint(
            "organization_id",
            "user_id",
            name="uq_org_github_admin_tokens_org_user",
        ),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    organization_id: Mapped[int] = mapped_column(
        ForeignKey("organizations.id", ondelete="CASCADE"),
        index=True,
    )
    user_id: Mapped[int] = mapped_column(
        ForeignKey("users.id", ondelete="CASCADE"),
        index=True,
    )

    github_user_id: Mapped[int] = mapped_column(index=True)
    github_login: Mapped[str] = mapped_column(String(200))

    access_token_enc: Mapped[str] = mapped_column(String(4096))
    refresh_token_enc: Mapped[str] = mapped_column(String(4096))
    token_expires_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), index=True)
    refresh_token_expires_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    last_verified_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
    revoked_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        server_default=func.now(),
        onupdate=func.now(),
    )

