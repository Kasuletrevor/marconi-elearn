from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.core.config import settings
from app.crud.audit import enqueue_audit_event
from app.crud.courses import get_course
from app.crud.invites import create_course_student_invites, parse_roster_from_csv_bytes
from app.db.deps import get_db
from app.integrations.email import send_email
from app.integrations.email_templates import invite_email
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/orgs/{org_id}/courses/{course_id}/invites",
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)


def _frontend_base() -> str:
    origins = settings.cors_allow_origins.split(",")
    return origins[0].strip().rstrip("/") if origins else "http://localhost:3000"


@router.post("/import-csv")
async def import_roster_csv(
    org_id: int,
    course_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    course = await get_course(db, course_id=course_id)
    if course is None or course.organization_id != org_id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    from app.models.organization import Organization

    org = await db.get(Organization, org_id)
    org_name = org.name if org else "Marconi Elearn"

    data = await file.read()
    try:
        roster_rows = parse_roster_from_csv_bytes(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    created_invites, auto_enrolled, issues = await create_course_student_invites(
        db,
        organization_id=org_id,
        course_id=course_id,
        rows=roster_rows,
        expires_in_days=7,
    )
    enqueue_audit_event(
        organization_id=org_id,
        actor_user_id=_current_user.id,
        action="course_roster.imported",
        target_type="course",
        target_id=course_id,
        metadata={
            "created_invites": len(created_invites),
            "auto_enrolled": auto_enrolled,
            "issues": len(issues),
        },
        context={"org_id": org_id, "course_id": course_id},
    )

    # Send invite emails (best-effort, don't block response on failures).
    base = _frontend_base()
    invite_links = [f"/invite/{ci.token}" for ci in created_invites]

    async def _send_invite_emails() -> None:
        for ci in created_invites:
            invite_url = f"{base}/invite/{ci.token}"
            subj, html, text = invite_email(
                recipient_name=ci.full_name or "",
                organization_name=org_name,
                course_name=course.title,
                invite_url=invite_url,
            )
            try:
                await send_email(to=ci.email, subject=subj, html_body=html, text_body=text)
            except Exception:
                logger.exception("Failed to send invite email to %s", ci.email)

    asyncio.ensure_future(_send_invite_emails())

    return {
        "created_invites": len(created_invites),
        "auto_enrolled": auto_enrolled,
        "issues": [i.__dict__ for i in issues],
        "invite_links": invite_links,
    }
