import enum
from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, UniqueConstraint, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class GitHubClaimStatus(str, enum.Enum):
    pending = "pending"
    approved = "approved"
    rejected = "rejected"


class CourseGitHubClaim(Base):
    __tablename__ = "course_github_claims"
    __table_args__ = (
        UniqueConstraint("course_membership_id", name="uq_course_github_claim_membership"),
        UniqueConstraint("course_id", "github_user_id", name="uq_course_github_claim_course_github_user"),
    )

    id: Mapped[int] = mapped_column(primary_key=True)
    course_id: Mapped[int] = mapped_column(
        ForeignKey("courses.id", ondelete="CASCADE"),
        index=True,
    )
    course_membership_id: Mapped[int] = mapped_column(
        ForeignKey("course_memberships.id", ondelete="CASCADE"),
        index=True,
    )

    github_user_id: Mapped[int] = mapped_column(Integer, index=True)
    github_login: Mapped[str] = mapped_column(String(200))

    status: Mapped[GitHubClaimStatus] = mapped_column(
        Enum(GitHubClaimStatus, name="github_claim_status"),
        index=True,
        server_default="pending",
    )

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    reviewed_by_user_id: Mapped[int | None] = mapped_column(
        ForeignKey("users.id", ondelete="SET NULL"),
        nullable=True,
    )
    reviewed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)

