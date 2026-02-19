import asyncio

import pytest

from app.core.config import settings
from app.worker import tasks as worker_tasks


@pytest.fixture(autouse=True)
def _restore_worker_concurrency_settings():
    original = settings.jobe_worker_max_concurrent_requests
    worker_tasks._reset_jobe_concurrency_semaphore_for_tests()
    try:
        yield
    finally:
        settings.jobe_worker_max_concurrent_requests = original
        worker_tasks._reset_jobe_concurrency_semaphore_for_tests()


@pytest.mark.asyncio
async def test_jobe_slot_serializes_requests_when_limit_is_one() -> None:
    settings.jobe_worker_max_concurrent_requests = 1
    worker_tasks._reset_jobe_concurrency_semaphore_for_tests()

    active = 0
    peak_active = 0

    async def _run(name: str) -> str:
        async def _op() -> str:
            nonlocal active, peak_active
            active += 1
            peak_active = max(peak_active, active)
            await asyncio.sleep(0.05)
            active -= 1
            return name

        return await worker_tasks._run_with_jobe_slot(context=name, op=_op)

    result = await asyncio.gather(_run("a"), _run("b"), _run("c"))
    assert result == ["a", "b", "c"]
    assert peak_active == 1


@pytest.mark.asyncio
async def test_jobe_slot_allows_parallel_requests_up_to_limit() -> None:
    settings.jobe_worker_max_concurrent_requests = 2
    worker_tasks._reset_jobe_concurrency_semaphore_for_tests()

    active = 0
    peak_active = 0

    async def _run(name: str) -> str:
        async def _op() -> str:
            nonlocal active, peak_active
            active += 1
            peak_active = max(peak_active, active)
            await asyncio.sleep(0.05)
            active -= 1
            return name

        return await worker_tasks._run_with_jobe_slot(context=name, op=_op)

    result = await asyncio.gather(_run("a"), _run("b"), _run("c"))
    assert result == ["a", "b", "c"]
    assert peak_active == 2
