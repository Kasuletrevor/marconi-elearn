"""CSV export queries for gradebook, roster, and audit log."""

from __future__ import annotations

import csv
import io
import json
from datetime import datetime

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.assignment import Assignment
from app.models.audit_event import AuditEvent
from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole
from app.models.student_profile import StudentProfile
from app.models.submission import Submission
from app.models.user import User


async def export_gradebook_csv(
    db: AsyncSession,
    *,
    course_id: int,
) -> str:
    """Build a gradebook CSV: rows = students, columns = assignments, cells = best score.

    Returns a UTF-8 CSV string.
    """
    # 1. Get all assignments for the course, ordered by due_date then id.
    assignments_result = await db.execute(
        select(Assignment)
        .where(Assignment.course_id == course_id)
        .order_by(Assignment.due_date.asc().nulls_last(), Assignment.id.asc())
    )
    assignments = list(assignments_result.scalars().all())
    if not assignments:
        return "No assignments found for this course.\n"

    # 2. Get all students enrolled in the course.
    members_result = await db.execute(
        select(CourseMembership, User, StudentProfile)
        .join(User, User.id == CourseMembership.user_id)
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .where(
            CourseMembership.course_id == course_id,
            CourseMembership.role == CourseRole.student,
        )
        .order_by(User.email.asc())
    )
    members = members_result.all()

    # 3. For each student+assignment, get the best score (latest submission).
    #    We fetch all submissions at once and pivot in Python.
    latest_sub = (
        select(
            Submission.user_id,
            Submission.assignment_id,
            func.max(Submission.id).label("latest_id"),
        )
        .where(Submission.assignment_id.in_([a.id for a in assignments]))
        .group_by(Submission.user_id, Submission.assignment_id)
        .subquery()
    )
    scores_result = await db.execute(
        select(
            Submission.user_id,
            Submission.assignment_id,
            Submission.score,
            Submission.status,
        ).join(latest_sub, Submission.id == latest_sub.c.latest_id)
    )
    # Build pivot: (user_id, assignment_id) -> score
    score_map: dict[tuple[int, int], int | None] = {}
    for row in scores_result.all():
        score_map[(row.user_id, row.assignment_id)] = row.score

    # 4. Write CSV.
    buf = io.StringIO()
    writer = csv.writer(buf)

    header = ["Email", "Full Name", "Student Number"]
    for a in assignments:
        header.append(f"{a.title} ({a.max_points})")
    header.append("Total")
    writer.writerow(header)

    for membership, user, profile in members:
        row = [
            user.email,
            profile.full_name if profile else "",
            membership.student_number or "",
        ]
        total = 0
        for a in assignments:
            score = score_map.get((user.id, a.id))
            row.append(str(score) if score is not None else "")
            if score is not None:
                total += score
        row.append(str(total))
        writer.writerow(row)

    return buf.getvalue()


async def export_roster_csv(
    db: AsyncSession,
    *,
    course_id: int,
) -> str:
    """Build a roster CSV with all course members."""
    result = await db.execute(
        select(CourseMembership, User, StudentProfile)
        .join(User, User.id == CourseMembership.user_id)
        .outerjoin(StudentProfile, StudentProfile.user_id == User.id)
        .where(CourseMembership.course_id == course_id)
        .order_by(CourseMembership.role.asc(), User.email.asc())
    )
    rows = result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["Email", "Full Name", "Role", "Student Number", "Programme"])

    for membership, user, profile in rows:
        writer.writerow(
            [
                user.email,
                profile.full_name if profile else "",
                membership.role.value,
                membership.student_number or "",
                profile.programme if profile else "",
            ]
        )

    return buf.getvalue()


async def export_submissions_csv(
    db: AsyncSession,
    *,
    course_id: int,
    assignment_id: int | None = None,
) -> str:
    """Build a submissions CSV for one course (optionally filtered to one assignment)."""
    stmt = (
        select(Submission, Assignment, User)
        .join(Assignment, Assignment.id == Submission.assignment_id)
        .join(User, User.id == Submission.user_id)
        .where(Assignment.course_id == course_id)
    )
    if assignment_id is not None:
        stmt = stmt.where(Submission.assignment_id == assignment_id)

    stmt = stmt.order_by(Submission.created_at.desc())
    result = await db.execute(stmt)
    rows = result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "Submission ID",
            "Assignment",
            "Student Email",
            "File Name",
            "Status",
            "Score",
            "Submitted At",
        ]
    )

    for submission, assignment, user in rows:
        writer.writerow(
            [
                submission.id,
                assignment.title,
                user.email,
                submission.file_name,
                submission.status.value,
                submission.score if submission.score is not None else "",
                submission.created_at.isoformat() if submission.created_at else "",
            ]
        )

    return buf.getvalue()


async def export_audit_csv(
    db: AsyncSession,
    *,
    organization_id: int,
    limit: int = 10000,
) -> str:
    """Export audit events for an organization as CSV."""
    result = await db.execute(
        select(AuditEvent, User)
        .outerjoin(User, User.id == AuditEvent.actor_user_id)
        .where(AuditEvent.organization_id == organization_id)
        .order_by(AuditEvent.created_at.desc())
        .limit(limit)
    )
    rows = result.all()

    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(
        [
            "ID",
            "Timestamp",
            "Actor Email",
            "Action",
            "Target Type",
            "Target ID",
            "Metadata",
        ]
    )

    for event, user in rows:
        writer.writerow(
            [
                event.id,
                event.created_at.isoformat() if event.created_at else "",
                user.email if user else "",
                event.action,
                event.target_type or "",
                event.target_id if event.target_id is not None else "",
                json.dumps(event.meta) if event.meta else "",
            ]
        )

    return buf.getvalue()
