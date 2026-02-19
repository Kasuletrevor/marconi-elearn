from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
import json
import logging
import time
from pathlib import Path
from types import SimpleNamespace
from typing import Any, Awaitable, Callable, TypeVar

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
from app.models.grading_event import GradingEvent
from app.models.submission import Submission, SubmissionStatus
from app.models.submission_test_result import GradingPhase, SubmissionTestResult
from app.worker.broker import broker
from app.worker.grading import prepare_jobe_run, run_test_case
from app.worker.zip_extract import ZipExtractionError

logger = logging.getLogger(__name__)
T = TypeVar("T")

_jobe_health_lock = asyncio.Lock()
_jobe_health_last_checked_monotonic = 0.0
_jobe_health_is_healthy = True
_jobe_health_last_error: str | None = None
_jobe_concurrency_semaphore = asyncio.Semaphore(
    max(1, int(settings.jobe_worker_max_concurrent_requests))
)


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
            await _run_with_jobe_slot(context="health_check", op=jobe.list_languages)
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


def _reset_jobe_concurrency_semaphore_for_tests(limit: int | None = None) -> None:
    global _jobe_concurrency_semaphore
    max_concurrent = (
        max(1, int(limit))
        if limit is not None
        else max(1, int(settings.jobe_worker_max_concurrent_requests))
    )
    _jobe_concurrency_semaphore = asyncio.Semaphore(max_concurrent)


@asynccontextmanager
async def _acquire_jobe_slot(*, context: str):
    wait_started = time.monotonic()
    await _jobe_concurrency_semaphore.acquire()
    wait_seconds = time.monotonic() - wait_started
    if wait_seconds >= 1.0:
        logger.info(
            "JOBE concurrency slot acquired after waiting %.2fs (context=%s)",
            wait_seconds,
            context,
        )
    try:
        yield
    finally:
        _jobe_concurrency_semaphore.release()


async def _run_with_jobe_slot(*, context: str, op: Callable[[], Awaitable[T]]) -> T:
    async with _acquire_jobe_slot(context=context):
        return await op()


def _log_grading_event(
    *,
    submission_id: int,
    phase: str,
    event_type: str,
    attempt: int,
    reason: str | None = None,
    context: str | None = None,
    duration_ms: int | None = None,
) -> None:
    payload: dict[str, Any] = {
        "submission_id": submission_id,
        "phase": phase,
        "event_type": event_type,
        "attempt": attempt,
    }
    if reason is not None:
        payload["reason"] = reason
    if context is not None:
        payload["context"] = context
    if duration_ms is not None:
        payload["duration_ms"] = duration_ms
    logger.info("grading_event %s", json.dumps(payload, sort_keys=True))


def _record_grading_event(
    db: Any,
    *,
    submission_id: int,
    phase: str,
    event_type: str,
    attempt: int,
    reason: str | None = None,
    context: str | None = None,
    duration_ms: int | None = None,
) -> None:
    db.add(
        GradingEvent(
            submission_id=submission_id,
            phase=phase,
            event_type=event_type,
            attempt=attempt,
            reason=reason,
            context=context,
            duration_ms=duration_ms,
        )
    )
    _log_grading_event(
        submission_id=submission_id,
        phase=phase,
        event_type=event_type,
        attempt=attempt,
        reason=reason,
        context=context,
        duration_ms=duration_ms,
    )


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
    attempt = max(0, int(attempt))
    started_at = time.monotonic()
    max_attempts = 3

    def _elapsed_ms() -> int:
        return int((time.monotonic() - started_at) * 1000)

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
            _log_grading_event(
                submission_id=submission_id,
                phase=phase,
                event_type="skipped",
                attempt=attempt,
                reason="not_pending",
            )
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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="jobe_unhealthy",
                context="health_gate",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
        logger.warning("Fail-fast grading due to JOBE health gate. submission_id=%s", submission_id)
        return {"status": "error", "reason": "jobe_unhealthy", "phase": phase}

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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="misconfigured",
                context="client_init",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
        return {"status": "error", "reason": "misconfigured"}

    async with session_factory() as db:
        submission = await db.get(Submission, submission_id)
        if submission is None:
            _log_grading_event(
                submission_id=submission_id,
                phase=phase,
                event_type="missing",
                attempt=attempt,
                reason="submission_missing",
            )
            return {"status": "missing"}
        _record_grading_event(
            db,
            submission_id=submission_id,
            phase=phase,
            event_type="started",
            attempt=attempt,
        )
        assignment = await db.get(Assignment, submission.assignment_id)
        if assignment is None:
            submission.status = SubmissionStatus.error
            submission.feedback = "Assignment missing"
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="assignment_missing",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
            return {"status": "error", "reason": "assignment_missing", "phase": phase}

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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="autograde_config_missing",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
            return {"status": "error", "score": 0, "tests": 0, "phase": phase}

        version = await db.get(AssignmentAutogradeVersion, int(version_id))
        if version is None:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Autograde configuration missing. Ask staff to configure autograding for this assignment."
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="autograde_version_missing",
                duration_ms=_elapsed_ms(),
            )
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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="no_tests_configured",
                duration_ms=_elapsed_ms(),
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
            async def _prepare() -> Any:
                return await prepare_jobe_run(
                    jobe,
                    submission_path=submission_path,
                    assignment=assignment_config,
                )

            prepared = await _run_with_jobe_slot(
                context="prepare_jobe_run",
                op=_prepare,
            )
        except JobeCircuitOpenError:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading infrastructure unavailable (JOBE circuit breaker open)."
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="jobe_circuit_open",
                context="prepare",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
            return {"status": "error", "reason": "jobe_circuit_open", "phase": phase}
        except ZipExtractionError as exc:
            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = str(exc)
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="invalid_submission",
                context="prepare",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
            return {"status": "error", "reason": "invalid_submission", "phase": phase}
        except JobeTransientError as exc:
            _mark_jobe_unhealthy(exc=exc, context="prepare_jobe_run")
            if attempt < max_attempts - 1:
                submission.status = SubmissionStatus.pending
                submission.feedback = (
                    f"Grading infrastructure temporarily unavailable. Retrying ({attempt + 1}/{max_attempts})."
                )
                _record_grading_event(
                    db,
                    submission_id=submission_id,
                    phase=phase,
                    event_type="retry",
                    attempt=attempt,
                    reason="jobe_transient",
                    context="prepare",
                )
                await db.commit()
                await db.close()
                await asyncio.sleep(min(2**attempt, 10))
                await grade_submission.kiq(submission_id=submission_id, phase=phase, attempt=attempt + 1)
                return {"status": "retrying", "attempt": attempt + 1, "phase": phase}

            submission.status = SubmissionStatus.error
            submission.score = 0
            submission.feedback = "Grading infrastructure temporarily unavailable. Please retry."
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="jobe_transient",
                context="prepare",
                duration_ms=_elapsed_ms(),
            )
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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="jobe_error",
                context="prepare",
                duration_ms=_elapsed_ms(),
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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="error",
                attempt=attempt,
                reason="internal_error",
                context="prepare",
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
            return {"status": "error", "reason": "internal_error", "phase": phase}

        results: list[SubmissionTestResult] = []
        passed_points = 0
        max_points = sum(int(tc.points) for tc in tests)
        cap_points = int(settings_snapshot.get("max_points", getattr(assignment, "max_points", 0)) or 0)
        terminal_reason: str | None = None

        for tc in tests:
            try:
                async def _run() -> Any:
                    return await run_test_case(
                        jobe,
                        prepared=prepared,
                        stdin=tc.stdin,
                        expected_stdout=tc.expected_stdout,
                        expected_stderr=tc.expected_stderr,
                        comparison_mode=getattr(tc, "comparison_mode", "trim") or "trim",
                    )

                check = await _run_with_jobe_slot(context="run_test_case", op=_run)
            except JobeCircuitOpenError:
                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading infrastructure unavailable (JOBE circuit breaker open)."
                _record_grading_event(
                    db,
                    submission_id=submission_id,
                    phase=phase,
                    event_type="error",
                    attempt=attempt,
                    reason="jobe_circuit_open",
                    context="run_test_case",
                    duration_ms=_elapsed_ms(),
                )
                await db.commit()
                return {"status": "error", "reason": "jobe_circuit_open", "phase": phase}
            except JobeTransientError as exc:
                _mark_jobe_unhealthy(exc=exc, context="run_test_case")
                if attempt < max_attempts - 1:
                    submission.status = SubmissionStatus.pending
                    submission.feedback = (
                        f"Grading infrastructure temporarily unavailable. Retrying ({attempt + 1}/{max_attempts})."
                    )
                    _record_grading_event(
                        db,
                        submission_id=submission_id,
                        phase=phase,
                        event_type="retry",
                        attempt=attempt,
                        reason="jobe_transient",
                        context="run_test_case",
                    )
                    await db.commit()
                    await db.close()
                    await asyncio.sleep(min(2**attempt, 10))
                    await grade_submission.kiq(submission_id=submission_id, phase=phase, attempt=attempt + 1)
                    return {"status": "retrying", "attempt": attempt + 1, "phase": phase}

                submission.status = SubmissionStatus.error
                submission.score = 0
                submission.feedback = "Grading infrastructure temporarily unavailable. Please retry."
                _record_grading_event(
                    db,
                    submission_id=submission_id,
                    phase=phase,
                    event_type="error",
                    attempt=attempt,
                    reason="jobe_transient",
                    context="run_test_case",
                    duration_ms=_elapsed_ms(),
                )
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
                _record_grading_event(
                    db,
                    submission_id=submission_id,
                    phase=phase,
                    event_type="error",
                    attempt=attempt,
                    reason="jobe_error",
                    context="run_test_case",
                    duration_ms=_elapsed_ms(),
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
                _record_grading_event(
                    db,
                    submission_id=submission_id,
                    phase=phase,
                    event_type="error",
                    attempt=attempt,
                    reason="internal_error",
                    context="run_test_case",
                    duration_ms=_elapsed_ms(),
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
                terminal_reason = "compile_error"
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
            _record_grading_event(
                db,
                submission_id=submission_id,
                phase=phase,
                event_type="graded",
                attempt=attempt,
                duration_ms=_elapsed_ms(),
            )
            await db.commit()
            return {"status": "graded", "score": submission.score, "tests": len(tests), "phase": phase}

        _record_grading_event(
            db,
            submission_id=submission_id,
            phase=phase,
            event_type="error",
            attempt=attempt,
            reason=terminal_reason or "grading_failed",
            duration_ms=_elapsed_ms(),
        )
        await db.commit()
        return {
            "status": "error",
            "reason": terminal_reason or "grading_failed",
            "tests": len(tests),
            "phase": phase,
        }


@broker.task
async def grade_submission(submission_id: int, phase: str = "practice", attempt: int = 0) -> dict[str, Any]:
    return await _grade_submission_impl(submission_id=submission_id, phase=phase, attempt=attempt)
