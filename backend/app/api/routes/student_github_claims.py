from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.db.deps import get_db
from app.models.course import Course
from app.models.course_github_claim import CourseGitHubClaim, GitHubClaimStatus
from app.models.course_membership import CourseMembership, CourseRole
from app.models.organization import Organization
from app.models.user import User
from app.schemas.course_github_claim import CourseGitHubClaimOut

router = APIRouter(prefix="/student/courses/{course_id}/github", tags=["student"])


@router.get("/claim", response_model=CourseGitHubClaimOut | None)
async def get_my_github_claim(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseGitHubClaim | None:
    membership = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == current_user.id,
            CourseMembership.role == CourseRole.student,
        )
    )
    member = membership.scalars().first()
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course student role required")

    result = await db.execute(
        select(CourseGitHubClaim).where(CourseGitHubClaim.course_membership_id == member.id)
    )
    return result.scalars().first()


@router.post("/claim", response_model=CourseGitHubClaimOut)
async def create_or_update_my_github_claim(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> CourseGitHubClaim:
    if not current_user.github_user_id or not current_user.github_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Connect GitHub first",
        )

    course_res = await db.execute(select(Course).where(Course.id == course_id))
    course = course_res.scalars().first()
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")
    org_res = await db.execute(select(Organization).where(Organization.id == course.organization_id))
    org = org_res.scalars().first()
    if org is None or not org.github_org_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="This course is not configured for GitHub",
        )

    membership = await db.execute(
        select(CourseMembership).where(
            CourseMembership.course_id == course_id,
            CourseMembership.user_id == current_user.id,
            CourseMembership.role == CourseRole.student,
        )
    )
    member = membership.scalars().first()
    if member is None:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Course student role required")

    if member.github_user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="GitHub already linked for this course")

    res = await db.execute(
        select(CourseGitHubClaim).where(CourseGitHubClaim.course_membership_id == member.id)
    )
    claim = res.scalars().first()
    if claim is None:
        claim = CourseGitHubClaim(
            course_id=course_id,
            course_membership_id=member.id,
            github_user_id=int(current_user.github_user_id),
            github_login=str(current_user.github_login),
        )
        db.add(claim)
    else:
        if claim.status == GitHubClaimStatus.approved:
            raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Claim already approved")
        claim.github_user_id = int(current_user.github_user_id)
        claim.github_login = str(current_user.github_login)
        claim.status = GitHubClaimStatus.pending
        claim.reviewed_by_user_id = None
        claim.reviewed_at = None

    await db.commit()
    await db.refresh(claim)
    return claim

