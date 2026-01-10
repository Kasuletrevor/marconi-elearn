from __future__ import annotations

from taskiq import AsyncBroker, InMemoryBroker
from taskiq_redis import ListQueueBroker

from app.core.config import settings


def _build_broker() -> AsyncBroker:
    if settings.redis_url.strip():
        return ListQueueBroker(settings.redis_url, queue_name=settings.taskiq_queue_name)
    return InMemoryBroker()


broker: AsyncBroker = _build_broker()

