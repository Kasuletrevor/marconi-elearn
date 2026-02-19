from __future__ import annotations

from app.core.config import settings
from app.integrations.jobe import JobeClient, parse_jobe_base_urls


def get_jobe_client() -> JobeClient:
    base_urls = parse_jobe_base_urls(
        base_url=settings.jobe_base_url,
        base_urls=settings.jobe_base_urls,
    )
    return JobeClient(
        base_urls=base_urls,
        timeout_seconds=settings.jobe_timeout_seconds,
        api_key=settings.jobe_api_key,
    )
