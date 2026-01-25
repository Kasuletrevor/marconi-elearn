from datetime import datetime

from pydantic import BaseModel, ConfigDict

from app.models.course_github_claim import GitHubClaimStatus


class CourseGitHubClaimOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    course_membership_id: int
    github_user_id: int
    github_login: str
    status: GitHubClaimStatus
    created_at: datetime
    reviewed_by_user_id: int | None = None
    reviewed_at: datetime | None = None

