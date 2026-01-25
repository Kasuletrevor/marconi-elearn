from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.db.deps import get_db
from app.models.course_github_claim import CourseGitHubClaim, GitHubClaimStatus
from app.models.course_membership import CourseMembership
from app.models.user import User
from app.schemas.course_github_claim import CourseGitHubClaimOut

router = APIRouter(prefix="/staff/courses/{course_id}/github-claims", tags=["staff"])


@router.get("", response_model=list[CourseGitHubClaimOut])
async def list_claims(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
    status_filter: GitHubClaimStatus | None = None,
) -> list[CourseGitHubClaim]:
    q = select(CourseGitHubClaim).where(CourseGitHubClaim.course_id == course_id)
    if status_filter is not None:
        q = q.where(CourseGitHubClaim.status == status_filter)
    q = q.order_by(CourseGitHubClaim.created_at.desc(), CourseGitHubClaim.id.desc())
    result = await db.execute(q)
    return list(result.scalars().all())


@router.post("/{claim_id}/approve", response_model=CourseGitHubClaimOut)
async def approve_claim(
    course_id: int,
    claim_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
) -> CourseGitHubClaim:
    res = await db.execute(
        select(CourseGitHubClaim).where(
            CourseGitHubClaim.id == claim_id,
            CourseGitHubClaim.course_id == course_id,
        )
    )
    claim = res.scalars().first()
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")
    if claim.status == GitHubClaimStatus.approved:
        return claim

    mem_res = await db.execute(
        select(CourseMembership).where(
            CourseMembership.id == claim.course_membership_id,
            CourseMembership.course_id == course_id,
        )
    )
    membership = mem_res.scalars().first()
    if membership is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course membership not found")
    if membership.github_user_id:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="Membership already linked to GitHub")

    membership.github_user_id = claim.github_user_id
    membership.github_login = claim.github_login
    membership.github_linked_at = datetime.now(timezone.utc)
    membership.github_linked_by_user_id = current_user.id

    claim.status = GitHubClaimStatus.approved
    claim.reviewed_by_user_id = current_user.id
    claim.reviewed_at = datetime.now(timezone.utc)

    await db.commit()
    await db.refresh(claim)
    return claim


@router.post("/{claim_id}/reject", response_model=CourseGitHubClaimOut)
async def reject_claim(
    course_id: int,
    claim_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
) -> CourseGitHubClaim:
    res = await db.execute(
        select(CourseGitHubClaim).where(
            CourseGitHubClaim.id == claim_id,
            CourseGitHubClaim.course_id == course_id,
        )
    )
    claim = res.scalars().first()
    if claim is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Claim not found")

    claim.status = GitHubClaimStatus.rejected
    claim.reviewed_by_user_id = current_user.id
    claim.reviewed_at = datetime.now(timezone.utc)
    await db.commit()
    await db.refresh(claim)
    return claim

