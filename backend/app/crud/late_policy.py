from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone


@dataclass(frozen=True)
class LatePolicyResolved:
    enabled: bool
    grace_minutes: int
    percent_per_day: int
    max_percent: int


def resolve_late_policy(*, course_policy: dict | None, assignment_policy: dict | None) -> LatePolicyResolved | None:
    policy = assignment_policy if assignment_policy is not None else course_policy
    if not policy:
        return None

    enabled = bool(policy.get("enabled", True))
    if not enabled:
        return None

    grace_minutes = int(policy.get("grace_minutes", 0) or 0)
    percent_per_day = int(policy.get("percent_per_day", 0) or 0)
    max_percent = int(policy.get("max_percent", 100) or 0)

    grace_minutes = max(0, min(grace_minutes, 7 * 24 * 60))
    percent_per_day = max(0, min(percent_per_day, 100))
    max_percent = max(0, min(max_percent, 100))

    return LatePolicyResolved(
        enabled=True,
        grace_minutes=grace_minutes,
        percent_per_day=percent_per_day,
        max_percent=max_percent,
    )


def compute_effective_due_date(
    *,
    assignment_due_date: datetime | None,
    extension_due_date: datetime | None,
) -> datetime | None:
    if extension_due_date is not None:
        return _ensure_tz(extension_due_date)
    if assignment_due_date is not None:
        return _ensure_tz(assignment_due_date)
    return None


def compute_late_penalty_percent(
    *,
    submitted_at: datetime,
    effective_due_date: datetime | None,
    policy: LatePolicyResolved | None,
) -> tuple[int | None, int | None]:
    """
    Returns (late_seconds, penalty_percent). Both are None if no due date.
    penalty_percent is None if no policy or policy percent is 0.
    """
    if effective_due_date is None:
        return None, None

    submitted_at = _ensure_tz(submitted_at)
    due = _ensure_tz(effective_due_date)

    grace = timedelta(minutes=policy.grace_minutes) if policy is not None else timedelta(0)
    effective_deadline = due + grace

    if submitted_at <= effective_deadline:
        return 0, 0

    late_seconds = int((submitted_at - effective_deadline).total_seconds())
    if policy is None or policy.percent_per_day <= 0:
        return late_seconds, 0

    days_late = (late_seconds + 86400 - 1) // 86400
    penalty = min(days_late * policy.percent_per_day, policy.max_percent)
    return late_seconds, int(penalty)


def _ensure_tz(value: datetime) -> datetime:
    if value.tzinfo is None:
        return value.replace(tzinfo=timezone.utc)
    return value

