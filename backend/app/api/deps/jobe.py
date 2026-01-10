from __future__ import annotations

from app.core.config import settings
from app.integrations.jobe import JobeClient


def get_jobe_client() -> JobeClient:
    return JobeClient(
        base_url=settings.jobe_base_url,
        timeout_seconds=settings.jobe_timeout_seconds,
    )

