from __future__ import annotations

from collections import defaultdict

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.grading_event import GradingEvent
from app.models.submission import Submission, SubmissionStatus

_PROMETHEUS_CONTENT_TYPE = "text/plain; version=0.0.4; charset=utf-8"


def metrics_content_type() -> str:
    return _PROMETHEUS_CONTENT_TYPE


def _escape_metric_label(value: str) -> str:
    return value.replace("\\", "\\\\").replace('"', '\\"').replace("\n", "\\n")


def _line(name: str, value: int | float, labels: dict[str, str] | None = None) -> str:
    if not labels:
        return f"{name} {value}"
    rendered = ",".join(
        f'{key}="{_escape_metric_label(str(label_value))}"'
        for key, label_value in sorted(labels.items())
    )
    return f"{name}{{{rendered}}} {value}"


async def render_grading_metrics(db: AsyncSession) -> str:
    lines: list[str] = []

    queue_by_status: dict[str, int] = {status.value: 0 for status in SubmissionStatus}
    queue_result = await db.execute(
        select(Submission.status, func.count(Submission.id)).group_by(Submission.status)
    )
    for status, count in queue_result.all():
        queue_by_status[str(getattr(status, "value", status))] = int(count)

    lines.extend(
        [
            "# HELP marconi_grading_queue_depth Current grading queue depth by submission status.",
            "# TYPE marconi_grading_queue_depth gauge",
        ]
    )
    for status in sorted(queue_by_status.keys()):
        lines.append(
            _line(
                "marconi_grading_queue_depth",
                queue_by_status[status],
                labels={"status": status},
            )
        )

    job_totals: dict[tuple[str, str], int] = defaultdict(int)
    job_totals_result = await db.execute(
        select(GradingEvent.phase, GradingEvent.event_type, func.count(GradingEvent.id))
        .where(GradingEvent.event_type.in_(("graded", "error")))
        .group_by(GradingEvent.phase, GradingEvent.event_type)
    )
    for phase, event_type, count in job_totals_result.all():
        job_totals[(str(phase), str(event_type))] = int(count)

    lines.extend(
        [
            "# HELP marconi_grading_jobs_total Total grading jobs by phase and result.",
            "# TYPE marconi_grading_jobs_total counter",
        ]
    )
    for phase in ("practice", "final"):
        for result in ("graded", "error"):
            lines.append(
                _line(
                    "marconi_grading_jobs_total",
                    job_totals[(phase, result)],
                    labels={"phase": phase, "result": result},
                )
            )

    retry_totals: dict[str, int] = defaultdict(int)
    retry_result = await db.execute(
        select(GradingEvent.phase, func.count(GradingEvent.id))
        .where(GradingEvent.event_type == "retry")
        .group_by(GradingEvent.phase)
    )
    for phase, count in retry_result.all():
        retry_totals[str(phase)] = int(count)

    lines.extend(
        [
            "# HELP marconi_grading_retries_total Total grading retries by phase.",
            "# TYPE marconi_grading_retries_total counter",
        ]
    )
    for phase in ("practice", "final"):
        lines.append(
            _line(
                "marconi_grading_retries_total",
                retry_totals[phase],
                labels={"phase": phase},
            )
        )

    jobe_error_totals: dict[tuple[str, str], int] = defaultdict(int)
    jobe_errors_result = await db.execute(
        select(
            GradingEvent.phase,
            GradingEvent.context,
            func.count(GradingEvent.id),
        )
        .where(
            GradingEvent.event_type == "error",
            GradingEvent.reason.like("jobe%"),
        )
        .group_by(GradingEvent.phase, GradingEvent.context)
    )
    for phase, context, count in jobe_errors_result.all():
        jobe_error_totals[(str(phase), str(context or "unknown"))] = int(count)

    lines.extend(
        [
            "# HELP marconi_jobe_errors_total Total JOBE-related grading errors by phase and context.",
            "# TYPE marconi_jobe_errors_total counter",
        ]
    )
    for phase in ("practice", "final"):
        for context in ("health_gate", "prepare", "run_test_case"):
            lines.append(
                _line(
                    "marconi_jobe_errors_total",
                    jobe_error_totals[(phase, context)],
                    labels={"phase": phase, "context": context},
                )
            )

    latency_totals: dict[tuple[str, str], tuple[int, int]] = defaultdict(lambda: (0, 0))
    latency_result = await db.execute(
        select(
            GradingEvent.phase,
            GradingEvent.event_type,
            func.count(GradingEvent.id),
            func.coalesce(func.sum(GradingEvent.duration_ms), 0),
        )
        .where(
            GradingEvent.event_type.in_(("graded", "error")),
            GradingEvent.duration_ms.is_not(None),
        )
        .group_by(GradingEvent.phase, GradingEvent.event_type)
    )
    for phase, event_type, count, sum_duration_ms in latency_result.all():
        latency_totals[(str(phase), str(event_type))] = (
            int(count),
            int(sum_duration_ms),
        )

    lines.extend(
        [
            "# HELP marconi_grading_latency_seconds Aggregated grading latency by phase and result.",
            "# TYPE marconi_grading_latency_seconds summary",
        ]
    )
    for phase in ("practice", "final"):
        for result in ("graded", "error"):
            count, sum_duration_ms = latency_totals[(phase, result)]
            labels = {"phase": phase, "result": result}
            lines.append(
                _line(
                    "marconi_grading_latency_seconds_sum",
                    round(sum_duration_ms / 1000.0, 6),
                    labels=labels,
                )
            )
            lines.append(
                _line(
                    "marconi_grading_latency_seconds_count",
                    count,
                    labels=labels,
                )
            )

    return "\n".join(lines) + "\n"
