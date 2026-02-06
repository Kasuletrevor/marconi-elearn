from __future__ import annotations

import time
from collections import defaultdict, deque
from collections.abc import Awaitable, Callable
from threading import Lock

from fastapi import HTTPException, Request, status


class _InMemorySlidingWindowLimiter:
    def __init__(self) -> None:
        self._events: dict[str, deque[float]] = defaultdict(deque)
        self._last_gc_monotonic = 0.0
        self._lock = Lock()

    def allow(self, *, key: str, limit: int, window_seconds: int) -> bool:
        now = time.monotonic()
        cutoff = now - window_seconds
        with self._lock:
            if now - self._last_gc_monotonic > 60:
                self._gc(now=now, stale_seconds=max(window_seconds * 2, 300))
                self._last_gc_monotonic = now

            queue = self._events[key]
            while queue and queue[0] <= cutoff:
                queue.popleft()
            if len(queue) >= limit:
                return False
            queue.append(now)
            return True

    def _gc(self, *, now: float, stale_seconds: int) -> None:
        stale_keys: list[str] = []
        for key, queue in self._events.items():
            if not queue:
                stale_keys.append(key)
                continue
            if now - queue[-1] > stale_seconds:
                stale_keys.append(key)
        for key in stale_keys:
            self._events.pop(key, None)


_limiter = _InMemorySlidingWindowLimiter()


def _client_ip(request: Request) -> str:
    if request.client and request.client.host:
        return request.client.host
    x_forwarded_for = request.headers.get("x-forwarded-for")
    if x_forwarded_for:
        return x_forwarded_for.split(",")[0].strip() or "unknown"
    return "unknown"


def make_rate_limit_dependency(
    *,
    bucket: str,
    limit: int,
    window_seconds: int = 60,
) -> Callable[[Request], Awaitable[None]]:
    if limit <= 0:
        async def _disabled(_request: Request) -> None:
            return None

        return _disabled

    async def _dependency(request: Request) -> None:
        key = f"{bucket}:{_client_ip(request)}"
        if _limiter.allow(key=key, limit=limit, window_seconds=window_seconds):
            return None
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests",
        )

    return _dependency
