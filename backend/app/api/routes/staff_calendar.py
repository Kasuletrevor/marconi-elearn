from __future__ import annotations

from datetime import datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.crud.calendar import list_staff_calendar_events
from app.db.deps import get_db
from app.models.user import User
from app.schemas.calendar import StaffCalendarEventOut

router = APIRouter(prefix="/staff/calendar", dependencies=[Depends(get_current_user)])


@router.get("/events", response_model=list[StaffCalendarEventOut])
async def staff_calendar_events(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    course_id: int | None = Query(default=None, ge=1),
    starts_at: datetime | None = Query(default=None),
    ends_at: datetime | None = Query(default=None),
    limit: int = Query(default=300, ge=1, le=1000),
) -> list[StaffCalendarEventOut]:
    if starts_at is not None and ends_at is not None and starts_at > ends_at:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="starts_at must be before ends_at",
        )
    if course_id is not None:
        await require_course_staff(course_id, current_user, db)
    rows = await list_staff_calendar_events(
        db,
        user_id=current_user.id,
        course_id=course_id,
        starts_at=starts_at,
        ends_at=ends_at,
        limit=limit,
    )
    return [StaffCalendarEventOut.model_validate(row) for row in rows]
