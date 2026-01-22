from __future__ import annotations

import asyncio
import logging
from datetime import datetime, timezone

from sqlalchemy import func, select, update

from app.db.session import SessionLocal
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.worker.enqueue import enqueue_grading

logger = logging.getLogger(__name__)


POLL_INTERVAL_SECONDS = 30
FINAL_BATCH_SIZE = 25


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


async def run_forever() -> None:
    logger.info("Starting deadline poller. interval=%ss", POLL_INTERVAL_SECONDS)
    while True:
        try:
            count = await enqueue_due_final_grades()
            if count:
                logger.info("Enqueued %s final grading jobs", count)
        except Exception:
            logger.exception("Deadline poller iteration failed")
        await asyncio.sleep(POLL_INTERVAL_SECONDS)


def main() -> None:
    asyncio.run(run_forever())


if __name__ == "__main__":
    main()

