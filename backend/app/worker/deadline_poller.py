from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.config import settings
from app.db.session import SessionLocal
from app.models.assignment import Assignment
from app.models.course import Course
from app.models.course_membership import CourseMembership, CourseRole
from app.models.notification import Notification, NotificationKind
from app.models.submission import Submission, SubmissionStatus
from app.models.user import User
from app.worker.enqueue import enqueue_grading

logger = logging.getLogger(__name__)


POLL_INTERVAL_SECONDS = 30
FINAL_BATCH_SIZE = 25
DUE_REMINDER_HOURS = 24
DUE_REMINDER_INTERVAL_SECONDS = 300  # check every 5 min


def _frontend_base() -> str:
    origins = settings.cors_allow_origins.split(",")
    return origins[0].strip().rstrip("/") if origins else "http://localhost:3000"


async def enqueue_due_final_grades() -> int:
    now = datetime.now(timezone.utc)
    enqueued = 0

    async with SessionLocal() as db:
        # Find assignments that need final grading enqueued.
        result = await db.execute(
            select(Assignment.id)
            .where(
                Assignment.due_date.is_not(None),
                Assignment.due_date <= now,
                Assignment.autograde_mode.in_(["final_only", "hybrid"]),
                Assignment.final_autograde_enqueued_at.is_(None),
                Assignment.active_autograde_version_id.is_not(None),
            )
            .order_by(Assignment.due_date.asc(), Assignment.id.asc())
            .limit(FINAL_BATCH_SIZE)
        )
        assignment_ids = [int(r[0]) for r in result.all()]

        for assignment_id in assignment_ids:
            # Atomically finalize (prevents double-enqueue if multiple pollers run).
            finalize = await db.execute(
                update(Assignment)
                .where(
                    Assignment.id == assignment_id,
                    Assignment.final_autograde_enqueued_at.is_(None),
                )
                .values(
                    final_autograde_enqueued_at=now,
                    final_autograde_version_id=Assignment.active_autograde_version_id,
                )
                .returning(Assignment.final_autograde_version_id)
            )
            row = finalize.first()
            if row is None:
                continue
            final_version_id = int(row[0])

            # Latest submission per user for this assignment.
            latest_ids_subq = (
                select(func.max(Submission.id).label("id"))
                .where(Submission.assignment_id == assignment_id)
                .group_by(Submission.user_id)
                .subquery()
            )
            subs_result = await db.execute(
                select(Submission).where(Submission.id.in_(select(latest_ids_subq.c.id)))
            )
            submissions = list(subs_result.scalars().all())

            for s in submissions:
                s.final_autograde_version_id = final_version_id
                s.status = SubmissionStatus.pending
                s.score = None
                s.feedback = None

            await db.commit()

            for s in submissions:
                try:
                    ok = await enqueue_grading(submission_id=s.id, phase="final")
                    if ok:
                        enqueued += 1
                except Exception:
                    logger.exception(
                        "Failed to enqueue final grading. assignment_id=%s submission_id=%s",
                        assignment_id,
                        s.id,
                    )

    return enqueued


async def send_due_reminders() -> int:
    """Send reminder emails/notifications for assignments due within 24 hours.

    Uses the notification table to track which reminders have already been sent
    (identified by kind=assignment_due_reminder and a deterministic link_url).
    """
    now = datetime.now(timezone.utc)
    cutoff = now + timedelta(hours=DUE_REMINDER_HOURS)
    sent = 0

    async with SessionLocal() as db:
        # Find assignments due within the next 24 hours that haven't passed yet.
        result = await db.execute(
            select(Assignment, Course)
            .join(Course, Course.id == Assignment.course_id)
            .where(
                Assignment.due_date.is_not(None),
                Assignment.due_date > now,
                Assignment.due_date <= cutoff,
            )
        )
        rows = result.all()

        for assignment, course in rows:
            # Deterministic link_url used as dedup key.
            link_url = f"/dashboard/courses/{course.id}/assignments/{assignment.id}"

            # Get enrolled students.
            students_result = await db.execute(
                select(CourseMembership.user_id).where(
                    CourseMembership.course_id == course.id,
                    CourseMembership.role == CourseRole.student,
                )
            )
            student_ids = [int(uid) for (uid,) in students_result.all()]
            if not student_ids:
                continue

            # Find students who already submitted.
            submitted_result = await db.execute(
                select(Submission.user_id)
                .where(
                    Submission.assignment_id == assignment.id,
                    Submission.user_id.in_(student_ids),
                )
                .distinct()
            )
            submitted_user_ids = {int(uid) for (uid,) in submitted_result.all()}

            # Students who haven't submitted.
            pending_student_ids = [uid for uid in student_ids if uid not in submitted_user_ids]
            if not pending_student_ids:
                continue

            # Check which students already received a reminder for this assignment.
            already_notified_result = await db.execute(
                select(Notification.user_id).where(
                    Notification.user_id.in_(pending_student_ids),
                    Notification.kind == NotificationKind.assignment_due_reminder,
                    Notification.link_url == link_url,
                )
            )
            already_notified = {int(uid) for (uid,) in already_notified_result.all()}
            to_notify = [uid for uid in pending_student_ids if uid not in already_notified]
            if not to_notify:
                continue

            # Resolve user emails.
            users_result = await db.execute(select(User).where(User.id.in_(to_notify)))
            users_by_id = {u.id: u for u in users_result.scalars().all()}

            due_str = assignment.due_date.strftime("%b %d, %Y at %I:%M %p UTC")

            for uid in to_notify:
                user = users_by_id.get(uid)
                if user is None:
                    continue

                # Create in-app notification (also serves as dedup marker).
                db.add(
                    Notification(
                        user_id=uid,
                        kind=NotificationKind.assignment_due_reminder,
                        title=f"Due soon: {assignment.title}",
                        body=f"Due {due_str} in {course.code}",
                        link_url=link_url,
                    )
                )

                # Fire-and-forget email.
                try:
                    from app.integrations.email import send_email
                    from app.integrations.email_templates import assignment_due_reminder_email

                    base = _frontend_base()
                    assignment_url = f"{base}{link_url}"
                    subject, html, text = assignment_due_reminder_email(
                        student_name=user.email.split("@")[0],
                        course_name=course.title,
                        assignment_title=assignment.title,
                        due_date_str=due_str,
                        assignment_url=assignment_url,
                    )

                    async def _do_send(
                        addr: str = user.email,
                        subj: str = subject,
                        h: str = html,
                        t: str = text,
                    ) -> None:
                        try:
                            await send_email(to=addr, subject=subj, html_body=h, text_body=t)
                        except Exception:
                            logger.exception("Failed to send due reminder email to=%s", addr)

                    asyncio.ensure_future(_do_send())
                except Exception:
                    logger.exception(
                        "Failed to schedule due reminder email. user_id=%s assignment_id=%s",
                        uid,
                        assignment.id,
                    )

                sent += 1

            await db.commit()

    return sent


async def run_forever() -> None:
    logger.info("Starting deadline poller. interval=%ss", POLL_INTERVAL_SECONDS)
    reminder_tick = 0
    reminder_every = max(1, DUE_REMINDER_INTERVAL_SECONDS // POLL_INTERVAL_SECONDS)
    while True:
        try:
            count = await enqueue_due_final_grades()
            if count:
                logger.info("Enqueued %s final grading jobs", count)
        except Exception:
            logger.exception("Deadline poller iteration failed")

        # Due reminders run less frequently.
        reminder_tick += 1
        if reminder_tick >= reminder_every:
            reminder_tick = 0
            try:
                sent = await send_due_reminders()
                if sent:
                    logger.info("Sent %s assignment due reminders", sent)
            except Exception:
                logger.exception("Due reminder iteration failed")

        await asyncio.sleep(POLL_INTERVAL_SECONDS)


def main() -> None:
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()
