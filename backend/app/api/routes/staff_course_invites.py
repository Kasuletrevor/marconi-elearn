from __future__ import annotations

import asyncio
import logging
from typing import Annotated

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.core.config import settings
from app.crud.courses import get_course
from app.crud.invites import RosterRow, create_course_student_invites, parse_roster_from_csv_bytes
from app.db.deps import get_db
from app.integrations.email import send_email
from app.integrations.email_templates import invite_email
from app.models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(
    prefix="/staff/courses/{course_id}/invites", dependencies=[Depends(get_current_user)]
)


def _frontend_base() -> str:
    origins = settings.cors_allow_origins.split(",")
    return origins[0].strip().rstrip("/") if origins else "http://localhost:3000"


class CourseStudentInviteByEmail(BaseModel):
    email: str = Field(min_length=3, max_length=320)
    full_name: str = Field(min_length=1, max_length=200)
    student_number: str = Field(min_length=1, max_length=50)
    programme: str = Field(min_length=1, max_length=200)


@router.post("/by-email", status_code=status.HTTP_201_CREATED)
async def invite_student_by_email(
    course_id: int,
    payload: CourseStudentInviteByEmail,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    await require_course_staff(course_id, current_user, db)

    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    from app.models.organization import Organization

    org = await db.get(Organization, course.organization_id)
    org_name = org.name if org else "Marconi Elearn"

    created_invites, auto_enrolled, issues = await create_course_student_invites(
        db,
        organization_id=course.organization_id,
        course_id=course_id,
        rows=[
            RosterRow(
                email=payload.email,
                full_name=payload.full_name,
                student_number=payload.student_number,
                programme=payload.programme,
            )
        ],
        expires_in_days=7,
    )
    invite_links = [f"/invite/{ci.token}" for ci in created_invites]

    # Send invite emails (best-effort, non-blocking).
    base = _frontend_base()

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


@router.post("/import-csv")
async def import_roster_csv(
    course_id: int,
    file: Annotated[UploadFile, File()],
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    await require_course_staff(course_id, current_user, db)

    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    from app.models.organization import Organization

    org = await db.get(Organization, course.organization_id)
    org_name = org.name if org else "Marconi Elearn"

    data = await file.read()
    try:
        roster_rows = parse_roster_from_csv_bytes(data)
    except ValueError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    created_invites, auto_enrolled, issues = await create_course_student_invites(
        db,
        organization_id=course.organization_id,
        course_id=course_id,
        rows=roster_rows,
        expires_in_days=7,
    )

    invite_links = [f"/invite/{ci.token}" for ci in created_invites]

    # Send invite emails (best-effort, non-blocking).
    base = _frontend_base()

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
