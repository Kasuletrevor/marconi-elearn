from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.superadmin import require_superadmin
from app.db.deps import get_db
from app.models.course import Course
from app.models.organization import Organization
from app.models.submission import Submission
from app.models.user import User

router = APIRouter(prefix="/superadmin/stats", dependencies=[Depends(require_superadmin)])


class SuperadminStatsOut(BaseModel):
    organizations_total: int
    users_total: int
    courses_total: int
    submissions_total: int
    submissions_today: int


@router.get("", response_model=SuperadminStatsOut)
async def get_superadmin_stats(
    db: Annotated[AsyncSession, Depends(get_db)],
) -> SuperadminStatsOut:
    org_total = await db.scalar(select(func.count()).select_from(Organization))
    users_total = await db.scalar(select(func.count()).select_from(User))
    courses_total = await db.scalar(select(func.count()).select_from(Course))
    submissions_total = await db.scalar(select(func.count()).select_from(Submission))

    now = datetime.now(timezone.utc)
    start_of_day = now.replace(hour=0, minute=0, second=0, microsecond=0)
    submissions_today = await db.scalar(
        select(func.count()).select_from(Submission).where(Submission.created_at >= start_of_day)
    )

    return SuperadminStatsOut(
        organizations_total=int(org_total or 0),
        users_total=int(users_total or 0),
        courses_total=int(courses_total or 0),
        submissions_total=int(submissions_total or 0),
        submissions_today=int(submissions_today or 0),
    )
