from __future__ import annotations

import asyncio
import logging
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any

from sqlalchemy import select, update
from taskiq import TaskiqEvents

from app.core.config import settings
from app.db.session import SessionLocal
from app.integrations.jobe import (
    JobeCircuitOpenError,
    JobeClient,
    JobeError,
    JobeMisconfiguredError,
    JobeTransientError,
)
from app.models.assignment import Assignment
from app.models.assignment_autograde_test_case_snapshot import AssignmentAutogradeTestCaseSnapshot
from app.models.assignment_autograde_version import AssignmentAutogradeVersion
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_test_result import GradingPhase, SubmissionTestResult
from app.worker.broker import broker
from app.worker.grading import prepare_jobe_run, run_test_case
from app.worker.zip_extract import ZipExtractionError

logger = logging.getLogger(__name__)

_jobe_health_lock = asyncio.Lock()
_jobe_health_last_checked_monotonic = 0.0
_jobe_health_is_healthy = True
_jobe_health_last_error: str | None = None


def _jobe_client() -> JobeClient:
    return JobeClient(
        base_url=settings.jobe_base_url,
        timeout_seconds=settings.jobe_timeout_seconds,
        api_key=settings.jobe_api_key,
    )


def _set_jobe_health(*, healthy: bool, error: str | None) -> None:
    global _jobe_health_is_healthy, _jobe_health_last_checked_monotonic, _jobe_health_last_error
    _jobe_health_is_healthy = healthy
    _jobe_health_last_error = error
    _jobe_health_last_checked_monotonic = time.monotonic()


async def _refresh_jobe_health(*, force: bool = False) -> tuple[bool, str | None]:
    now = time.monotonic()
    interval_seconds = settings.jobe_worker_health_check_interval_seconds
    if (
        not force
        and _jobe_health_last_checked_monotonic > 0
        and (now - _jobe_health_last_checked_monotonic) < interval_seconds
    ):
        return _jobe_health_is_healthy, _jobe_health_last_error

    async with _jobe_health_lock:
        now = time.monotonic()
        if (
            not force
            and _jobe_health_last_checked_monotonic > 0
            and (now - _jobe_health_last_checked_monotonic) < interval_seconds
        ):
            return _jobe_health_is_healthy, _jobe_health_last_error

        try:
            jobe = _jobe_client()
            await jobe.list_languages()
        except Exception as exc:
            message = str(exc) or exc.__class__.__name__
            _set_jobe_health(healthy=False, error=message)
            logger.warning("JOBE health check failed: %s", message)
            return False, message

        if not _jobe_health_is_healthy:
            logger.info("JOBE health check recovered")
        _set_jobe_health(healthy=True, error=None)
        return True, None


async def _ensure_jobe_healthy(*, force: bool = False) -> None:
    healthy, error = await _refresh_jobe_health(force=force)
    if healthy:
        return
    raise JobeTransientError(error or "JOBE health check failed")


def _mark_jobe_unhealthy(*, exc: Exception, context: str) -> None:
    message = f"{context}: {str(exc) or exc.__class__.__name__}"
    _set_jobe_health(healthy=False, error=message)


@broker.on_event(TaskiqEvents.WORKER_STARTUP)
async def _worker_startup_health_check(_state: Any) -> None:
    if not settings.jobe_worker_startup_healthcheck_required:
        logger.info("JOBE startup health check is disabled")
        return
    await _ensure_jobe_healthy(force=True)
    logger.info("JOBE startup health check passed")


async def _grade_submission_impl(
    submission_id: int,
    phase: str = "practice",
    attempt: int = 0,
    *,
    session_factory=SessionLocal,
) -> dict[str, Any]:
    phase = str(phase or "practice").strip().lower()
    if phase not in {GradingPhase.practice.value, GradingPhase.final.value}:
        phase = GradingPhase.practice.value

    # Idempotency: only one worker transitions pending -> grading.
    async with session_factory() as db:
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

    try:
        await _ensure_jobe_healthy()
    except (JobeTransientError, JobeMisconfiguredError):
        async with session_factory() as db:
            submission = await db.get(Submission, submission_id)
            if submission is None:
                return {"status": "missing"}
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading infrastructure unavailable (JOBE health check failed)."
            await db.commit()
        logger.warning("Fail-fast grading due to JOBE health gate. submission_id=%s", submission_id)
        return {"status": "error", "reason": "jobe_unhealthy", "phase": phase}

    max_attempts = 3
    attempt = max(0, int(attempt))
    try:
        jobe = _jobe_client()
    except JobeMisconfiguredError as exc:
        async with session_factory() as db:
            submission = await db.get(Submission, submission_id)
            if submission is None:
                return {"status": "missing"}
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = str(exc)
            await db.commit()
        return {"status": "error", "reason": "misconfigured"}

    async with session_factory() as db:
        submission = await db.get(Submission, submission_id)
        if submission is None:
            return {"status": "missing"}
        assignment = await db.get(Assignment, submission.assignment_id)
        if assignment is None:
            submission.status = SubmissionStatus.error
            submission.feedback = "Assignment missing"
            await db.commit()
            return {"status": "error"}

        if phase == GradingPhase.practice.value:
            version_id = submission.practice_autograde_version_id or assignment.active_autograde_version_id
            submission.practice_autograde_version_id = version_id
        else:
            version_id = assignment.final_autograde_version_id or submission.final_autograde_version_id
            submission.final_autograde_version_id = version_id
        if version_id is None:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Autograde configuration missing. Ask staff to configure autograding for this assignment."
            await db.commit()
            return {"status": "error", "score": 0, "tests": 0, "phase": phase}

        version = await db.get(AssignmentAutogradeVersion, int(version_id))
        if version is None:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Autograde configuration missing. Ask staff to configure autograding for this assignment."
            await db.commit()
            return {"status": "error", "score": 0, "tests": 0, "phase": phase}

        tests_stmt = select(AssignmentAutogradeTestCaseSnapshot).where(
            AssignmentAutogradeTestCaseSnapshot.autograde_version_id == int(version_id)
        )
        if phase == GradingPhase.practice.value:
            tests_stmt = tests_stmt.where(AssignmentAutogradeTestCaseSnapshot.is_hidden.is_(False))
        tests_result = await db.execute(
            tests_stmt.order_by(
                AssignmentAutogradeTestCaseSnapshot.position.asc(),
                AssignmentAutogradeTestCaseSnapshot.id.asc(),
            )
        )
        tests = list(tests_result.scalars().all())
        if not tests:
            submission.status = SubmissionStatus.error
            submission.score = 0
            if phase == GradingPhase.practice.value:
                submission.feedback = (
                    "No visible practice tests configured. Ask staff to add at least one visible test case."
                )
            else:
                submission.feedback = (
                    "No final tests configured. Ask staff to add test cases for this assignment."
                )
            await db.commit()
            return {"status": "error", "score": 0, "tests": 0, "phase": phase}

        settings_snapshot = version.grading_settings or {}
        assignment_config = SimpleNamespace(
            allows_zip=bool(settings_snapshot.get("allows_zip", bool(getattr(assignment, "allows_zip", False)))),
            expected_filename=settings_snapshot.get("expected_filename", getattr(assignment, "expected_filename", None)),
            compile_command=settings_snapshot.get("compile_command", getattr(assignment, "compile_command", None)),
        )

        submission_path = Path(submission.storage_path)
        try:
            prepared = await prepare_jobe_run(
                jobe,
                submission_path=submission_path,
                assignment=assignment_config,
            )
        except JobeCircuitOpenError:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading infrastructure unavailable (JOBE circuit breaker open)."
            await db.commit()
            return {"status": "error", "reason": "jobe_circuit_open", "phase": phase}
        except ZipExtractionError as exc:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = str(exc)
            await db.commit()
            return {"status": "error", "reason": "invalid_submission", "phase": phase}
        except JobeTransientError as exc:
            _mark_jobe_unhealthy(exc=exc, context="prepare_jobe_run")
            if attempt < max_attempts - 1:
                submission.status = SubmissionStatus.pending
                submission.feedback = (
                    f"Grading infrastructure temporarily unavailable. Retrying ({attempt + 1}/{max_attempts})."
                )
                await db.commit()
                await db.close()
                await asyncio.sleep(min(2**attempt, 10))
                await grade_submission.kiq(submission_id=submission_id, phase=phase, attempt=attempt + 1)
                return {"status": "retrying", "attempt": attempt + 1, "phase": phase}

            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading infrastructure temporarily unavailable. Please retry."
            await db.commit()
            return {"status": "error", "reason": "jobe_transient", "phase": phase}
        except JobeError:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading failed due to JOBE error"
            logger.exception(
                "Grading failed due to JOBE error during prepare. submission_id=%s attempt=%s",
                submission_id,
                attempt,
            )
            await db.commit()
            return {"status": "error", "reason": "jobe_error", "phase": phase}
        except Exception:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading failed due to internal error"
            logger.exception(
                "Grading failed due to internal error during prepare. submission_id=%s attempt=%s",
                submission_id,
                attempt,
            )
            await db.commit()
            return {"status": "error", "reason": "internal_error", "phase": phase}

        results: list[SubmissionTestResult] = []
        passed_points = 0
        max_points = sum(int(tc.points) for tc in tests)
        cap_points = int(settings_snapshot.get("max_points", getattr(assignment, "max_points", 0)) or 0)

        for tc in tests:
            try:
                check = await run_test_case(
                    jobe,
                    prepared=prepared,
                    stdin=tc.stdin,
                    expected_stdout=tc.expected_stdout,
                    expected_stderr=tc.expected_stderr,
                    comparison_mode=getattr(tc, "comparison_mode", "trim") or "trim",
                )
            except JobeCircuitOpenError:
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading infrastructure unavailable (JOBE circuit breaker open)."
                await db.commit()
                return {"status": "error", "reason": "jobe_circuit_open", "phase": phase}
            except JobeTransientError as exc:
                _mark_jobe_unhealthy(exc=exc, context="run_test_case")
                if attempt < max_attempts - 1:
                    submission.status = SubmissionStatus.pending
                    submission.feedback = (
                        f"Grading infrastructure temporarily unavailable. Retrying ({attempt + 1}/{max_attempts})."
                    )
                    await db.commit()
                    await db.close()
                    await asyncio.sleep(min(2**attempt, 10))
                    await grade_submission.kiq(submission_id=submission_id, phase=phase, attempt=attempt + 1)
                    return {"status": "retrying", "attempt": attempt + 1, "phase": phase}

                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading infrastructure temporarily unavailable. Please retry."
                await db.commit()
                return {"status": "error", "reason": "jobe_transient", "phase": phase}
            except JobeError:
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading failed due to JOBE error"
                logger.exception(
                    "Grading failed due to JOBE error. submission_id=%s test_case_id=%s attempt=%s",
                    submission_id,
                    tc.test_case_id,
                    attempt,
                )
                await db.commit()
                return {"status": "error", "reason": "jobe_error", "phase": phase}
            except Exception:
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading failed due to internal error"
                logger.exception(
                    "Grading failed due to internal error. submission_id=%s test_case_id=%s attempt=%s",
                    submission_id,
                    tc.test_case_id,
                    attempt,
                )
                await db.commit()
                return {"status": "error", "reason": "internal_error", "phase": phase}
            results.append(
                SubmissionTestResult(
                    submission_id=submission.id,
                    test_case_id=tc.test_case_id,
                    phase=phase,
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
                passed_points += int(tc.points)

        # Replace existing results.
        from app.crud.submission_test_results import replace_submission_test_results

        await replace_submission_test_results(
            db,
            submission_id=submission.id,
            results=results,
            phase=phase,
            commit=False,
        )

        if submission.status != SubmissionStatus.error:
            submission.status = SubmissionStatus.graded
            submission.score = min(passed_points, cap_points if cap_points > 0 else passed_points)
            prefix = "Final" if phase == GradingPhase.final.value else "Practice"
            submission.feedback = f"{prefix}: Passed {passed_points}/{max_points} points across {len(tests)} tests."
            await db.commit()
            return {"status": "graded", "score": submission.score, "tests": len(tests), "phase": phase}

        await db.commit()
        return {"status": "error", "tests": len(tests), "phase": phase}


@broker.task
async def grade_submission(submission_id: int, phase: str = "practice", attempt: int = 0) -> dict[str, Any]:
    return await _grade_submission_impl(submission_id=submission_id, phase=phase, attempt=attempt)
