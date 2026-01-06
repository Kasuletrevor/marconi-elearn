from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.invites import get_invite_by_token
from app.db.deps import get_db
from app.models.course import Course
from app.models.organization import Organization
from app.schemas.invite_preview import InvitePreviewResponse

router = APIRouter(prefix="/invites")


@router.get("/preview", response_model=InvitePreviewResponse)
async def preview_invite(
    token: str,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> InvitePreviewResponse:
    invite = await get_invite_by_token(db, token=token)
    if invite is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Invite not found")

    now = datetime.now(timezone.utc)
    if invite.used_at is not None:
        invite_status = "used"
    elif invite.expires_at <= now:
        invite_status = "expired"
    else:
        invite_status = "valid"

    org = await db.get(Organization, invite.organization_id)
    course = await db.get(Course, invite.course_id) if invite.course_id is not None else None

    return InvitePreviewResponse(
        status=invite_status,
        expires_at=invite.expires_at,
        organization_name=org.name if org else None,
        course_id=course.id if course else None,
        course_code=course.code if course else None,
        course_title=course.title if course else None,
    )

