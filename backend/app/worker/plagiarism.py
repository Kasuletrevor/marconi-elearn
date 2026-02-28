"""Taskiq task for executing MOSS plagiarism detection."""

from __future__ import annotations

import logging
import re
from pathlib import Path
from typing import Any

from sqlalchemy import and_, func, select

from app.core.config import settings
from app.crud.plagiarism import bulk_create_pairs, get_plagiarism_run, update_run_status
from app.db.session import SessionLocal
from app.integrations.moss_client import submit_to_moss
from app.models.submission import Submission, SubmissionStatus
from app.worker.broker import broker

logger = logging.getLogger(__name__)


def _extract_user_id_from_filename(filename: str) -> int | None:
    """Extract user_id from filenames like `user_42_main.c`."""
    m = re.match(r"user_(\d+)_", filename)
    return int(m.group(1)) if m else None


async def _execute_plagiarism_run_impl(run_id: int, language: str) -> None:
    """Execute one plagiarism run end-to-end."""
    async with SessionLocal() as db:
        run = await get_plagiarism_run(db, run_id=run_id)
        if run is None:
            logger.error("Plagiarism run %d not found", run_id)
            return

        await update_run_status(db, run=run, status="running")

        try:
            latest_sub = (
                select(
                    Submission.user_id,
                    func.max(Submission.id).label("max_id"),
                )
                .where(Submission.assignment_id == run.assignment_id)
                .where(Submission.status != SubmissionStatus.error)
                .group_by(Submission.user_id)
                .subquery()
            )

            result = await db.execute(
                select(Submission).join(
                    latest_sub,
                    and_(
                        Submission.user_id == latest_sub.c.user_id,
                        Submission.id == latest_sub.c.max_id,
                    ),
                )
            )
            submissions = list(result.scalars().all())

            if len(submissions) < 2:
                await update_run_status(
                    db,
                    run=run,
                    status="completed",
                    pair_count=0,
                    error_message="Need at least 2 submissions for plagiarism check",
                )
                return

            files: list[tuple[str, bytes]] = []
            submission_map: dict[int, int] = {}

            for sub in submissions:
                file_path = Path(settings.uploads_dir) / sub.storage_path
                if not file_path.exists():
                    logger.warning(
                        "Submission file not found: %s (submission %d)",
                        file_path,
                        sub.id,
                    )
                    continue

                content = file_path.read_bytes()
                safe_name = sub.file_name.replace(" ", "_")
                files.append((f"user_{sub.user_id}_{safe_name}", content))
                submission_map[sub.user_id] = sub.id

            if len(files) < 2:
                await update_run_status(
                    db,
                    run=run,
                    status="completed",
                    pair_count=0,
                    error_message="Fewer than 2 readable submission files found",
                )
                return

            moss_result = await submit_to_moss(
                moss_user_id=settings.moss_user_id,
                language=language,
                files=files,
            )

            threshold_pct = int(settings.plagiarism_similarity_threshold * 100)
            pair_dicts: list[dict[str, Any]] = []

            for match in moss_result.matches:
                if match.similarity_pct < threshold_pct:
                    continue

                uid_a = _extract_user_id_from_filename(match.student_a_filename)
                uid_b = _extract_user_id_from_filename(match.student_b_filename)
                if uid_a is None or uid_b is None:
                    logger.warning(
                        "Could not extract user IDs from MOSS match: %s vs %s",
                        match.student_a_filename,
                        match.student_b_filename,
                    )
                    continue

                pair_dicts.append(
                    {
                        "student_a_user_id": uid_a,
                        "student_b_user_id": uid_b,
                        "submission_a_id": submission_map.get(uid_a),
                        "submission_b_id": submission_map.get(uid_b),
                        "similarity_pct": match.similarity_pct,
                        "lines_matched": match.lines_matched or None,
                        "moss_match_url": match.match_url,
                    }
                )

            count = await bulk_create_pairs(db, run_id=run.id, pairs=pair_dicts)
            await update_run_status(
                db,
                run=run,
                status="completed",
                moss_report_url=moss_result.report_url,
                pair_count=count,
            )

            logger.info(
                "Plagiarism run %d completed: %d pairs (threshold %d%%)",
                run.id,
                count,
                threshold_pct,
            )

        except Exception:
            logger.exception("Plagiarism run %d failed", run_id)
            await db.rollback()
            run = await get_plagiarism_run(db, run_id=run_id)
            if run is not None:
                await update_run_status(
                    db,
                    run=run,
                    status="error",
                    error_message="MOSS check failed - see server logs for details",
                )


@broker.task
async def execute_plagiarism_run(run_id: int, language: str = "c") -> dict[str, Any]:
    """Taskiq entrypoint."""
    await _execute_plagiarism_run_impl(run_id=run_id, language=language)
    return {"status": "done", "run_id": run_id}


async def enqueue_plagiarism_run(*, run_id: int, language: str) -> bool:
    """Queue plagiarism execution via Taskiq."""
    if not settings.redis_url.strip():
        return False
    await execute_plagiarism_run.kiq(run_id=run_id, language=language)
    return True
