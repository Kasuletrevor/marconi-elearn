from __future__ import annotations

from datetime import datetime
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.assignment_extension import AssignmentExtension
from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole

_STAFF_ROLES = [CourseRole.owner, CourseRole.co_lecturer, CourseRole.ta]


def _clamp_limit(limit: int) -> int:
    return min(max(1, limit), 1000)


async def list_student_calendar_events(
    db: AsyncSession,
    *,
    user_id: int,
    course_id: int | None = None,
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
    limit: int = 300,
) -> list[dict[str, Any]]:
    effective_due_date = func.coalesce(
        AssignmentExtension.extended_due_date,
        Assignment.due_date,
    ).label("effective_due_date")
    stmt = (
        select(
            Assignment.id.label("assignment_id"),
            Assignment.title.label("assignment_title"),
            Assignment.due_date.label("due_date"),
            AssignmentExtension.extended_due_date.label("extended_due_date"),
            effective_due_date,
            Course.id.label("course_id"),
            Course.code.label("course_code"),
            Course.title.label("course_title"),
        )
        .join(Course, Course.id == Assignment.course_id)
        .join(CourseMembership, CourseMembership.course_id == Course.id)
        .outerjoin(
            AssignmentExtension,
            and_(
                AssignmentExtension.assignment_id == Assignment.id,
                AssignmentExtension.user_id == user_id,
            ),
        )
        .where(
            CourseMembership.user_id == user_id,
            Assignment.due_date.is_not(None),
        )
    )
    if course_id is not None:
        stmt = stmt.where(Assignment.course_id == course_id)
    if starts_at is not None:
        stmt = stmt.where(effective_due_date >= starts_at)
    if ends_at is not None:
        stmt = stmt.where(effective_due_date <= ends_at)
    stmt = stmt.order_by(effective_due_date.asc(), Assignment.id.asc()).limit(_clamp_limit(limit))
    result = await db.execute(stmt)
    rows = result.mappings().all()
    return [
        {
            "assignment_id": int(row["assignment_id"]),
            "assignment_title": str(row["assignment_title"]),
            "course_id": int(row["course_id"]),
            "course_code": str(row["course_code"]),
            "course_title": str(row["course_title"]),
            "due_date": row["due_date"],
            "effective_due_date": row["effective_due_date"],
            "has_extension": row["extended_due_date"] is not None,
        }
        for row in rows
    ]


async def list_staff_calendar_events(
    db: AsyncSession,
    *,
    user_id: int,
    course_id: int | None = None,
    starts_at: datetime | None = None,
    ends_at: datetime | None = None,
    limit: int = 300,
) -> list[dict[str, Any]]:
    stmt = (
        select(
            Assignment.id.label("assignment_id"),
            Assignment.title.label("assignment_title"),
            Assignment.due_date.label("due_date"),
            Course.id.label("course_id"),
            Course.code.label("course_code"),
            Course.title.label("course_title"),
        )
        .join(Course, Course.id == Assignment.course_id)
        .join(CourseMembership, CourseMembership.course_id == Course.id)
        .where(
            CourseMembership.user_id == user_id,
            CourseMembership.role.in_(_STAFF_ROLES),
            Assignment.due_date.is_not(None),
        )
    )
    if course_id is not None:
        stmt = stmt.where(Assignment.course_id == course_id)
    if starts_at is not None:
        stmt = stmt.where(Assignment.due_date >= starts_at)
    if ends_at is not None:
        stmt = stmt.where(Assignment.due_date <= ends_at)
    stmt = stmt.order_by(Assignment.due_date.asc(), Assignment.id.asc()).limit(_clamp_limit(limit))
    result = await db.execute(stmt)
    rows = result.mappings().all()
    return [
        {
            "assignment_id": int(row["assignment_id"]),
            "assignment_title": str(row["assignment_title"]),
            "course_id": int(row["course_id"]),
            "course_code": str(row["course_code"]),
            "course_title": str(row["course_title"]),
            "due_date": row["due_date"],
        }
        for row in rows
    ]
