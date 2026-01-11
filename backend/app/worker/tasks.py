from __future__ import annotations

import asyncio
from pathlib import Path
from typing import Any

from sqlalchemy import select, update

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.jobe import JobeClient, JobeError, JobeMisconfiguredError, JobeTransientError
from app.models.assignment import Assignment
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_test_result import SubmissionTestResult
from app.models.test_case import TestCase
from app.worker.broker import broker
from app.worker.grading import run_test_case


def _jobe_client() -> JobeClient:
    return JobeClient(base_url=settings.jobe_base_url, timeout_seconds=settings.jobe_timeout_seconds)


@broker.task
async def grade_submission(submission_id: int, attempt: int = 0) -> dict[str, Any]:
    # Idempotency: only one worker transitions pending -> grading.
    async with SessionLocal() as db:
        result = await db.execute(
            update(Submission)
            .where(Submission.id == submission_id, Submission.status == SubmissionStatus.pending)
            .values(status=SubmissionStatus.grading)
            .returning(Submission.id)
        )
        row = result.first()
        if row is None:
            return {"status": "skipped"}
        await db.commit()

    max_attempts = 3
    attempt = max(0, int(attempt))
    try:
        jobe = _jobe_client()
    except JobeMisconfiguredError as exc:
        async with SessionLocal() as db:
            submission = await db.get(Submission, submission_id)
            if submission is None:
                return {"status": "missing"}
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = str(exc)
            await db.commit()
        return {"status": "error", "reason": "misconfigured"}

    async with SessionLocal() as db:
        submission = await db.get(Submission, submission_id)
        if submission is None:
            return {"status": "missing"}
        assignment = await db.get(Assignment, submission.assignment_id)
        if assignment is None:
            submission.status = SubmissionStatus.error
            submission.feedback = "Assignment missing"
            await db.commit()
            return {"status": "error"}

        tests_result = await db.execute(
            select(TestCase).where(TestCase.assignment_id == assignment.id).order_by(TestCase.position.asc(), TestCase.id.asc())
        )
        tests = list(tests_result.scalars().all())
        if not tests:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "No test cases configured. Ask staff to add test cases for this assignment."
            await db.commit()
            return {"status": "error", "score": 0, "tests": 0}

        submission_path = Path(submission.storage_path)
        results: list[SubmissionTestResult] = []
        passed_points = 0
        max_points = sum(tc.points for tc in tests)

        for tc in tests:
            try:
                check = await run_test_case(
                    jobe,
                    submission_path=submission_path,
                    stdin=tc.stdin,
                    expected_stdout=tc.expected_stdout,
                    expected_stderr=tc.expected_stderr,
                )
            except JobeTransientError:
                if attempt < max_attempts - 1:
                    submission.status = SubmissionStatus.pending
                    submission.feedback = (
                        f"Grading infrastructure temporarily unavailable. Retrying ({attempt + 1}/{max_attempts})."
                    )
                    await db.commit()
                    await db.close()
                    await asyncio.sleep(min(2**attempt, 10))
                    await grade_submission.kiq(submission_id=submission_id, attempt=attempt + 1)
                    return {"status": "retrying", "attempt": attempt + 1}

                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading infrastructure temporarily unavailable. Please retry."
                await db.commit()
                return {"status": "error", "reason": "jobe_transient"}
            except JobeError:
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading failed due to JOBE error"
                await db.commit()
                return {"status": "error", "reason": "jobe_error"}
            except Exception:
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading failed due to internal error"
                await db.commit()
                return {"status": "error", "reason": "internal_error"}
            results.append(
                SubmissionTestResult(
                    submission_id=submission.id,
                    test_case_id=tc.id,
                    passed=check.passed,
                    outcome=check.outcome,
                    compile_output=check.compile_output,
                    stdout=check.stdout,
                    stderr=check.stderr,
                )
            )

            if check.compile_output.strip():
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = check.compile_output
                break

            if check.passed:
                passed_points += tc.points

        # Replace existing results.
        from app.crud.submission_test_results import replace_submission_test_results

        await replace_submission_test_results(db, submission_id=submission.id, results=results)

        if submission.status != SubmissionStatus.error:
            submission.status = SubmissionStatus.graded
            submission.score = min(passed_points, assignment.max_points)
            submission.feedback = f"Passed {passed_points}/{max_points} points across {len(tests)} tests."
            await db.commit()
            return {"status": "graded", "score": submission.score, "tests": len(tests)}

        await db.commit()
        return {"status": "error", "tests": len(tests)}
