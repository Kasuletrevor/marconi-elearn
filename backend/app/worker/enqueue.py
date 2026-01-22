from __future__ import annotations

from app.core.config import settings
from app.worker.tasks import grade_submission


async def enqueue_grading(*, submission_id: int, phase: str = "practice") -> bool:
    if not settings.redis_url.strip():
        return False
    await grade_submission.kiq(submission_id=submission_id, phase=phase, attempt=0)
    return True
