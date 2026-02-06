from uuid import uuid4

import pytest
from fastapi import HTTPException
from starlette.requests import Request

from app.api.deps.rate_limit import make_rate_limit_dependency


def _request_for(ip: str) -> Request:
    scope = {
        "type": "http",
        "method": "GET",
        "path": "/",
        "headers": [],
        "client": (ip, 12345),
    }
    return Request(scope)


@pytest.mark.asyncio
async def test_rate_limit_blocks_when_limit_reached() -> None:
    dependency = make_rate_limit_dependency(
        bucket=f"test-{uuid4().hex}",
        limit=1,
        window_seconds=60,
    )
    request = _request_for("10.10.10.10")
    await dependency(request)

    with pytest.raises(HTTPException) as exc:
        await dependency(request)
    assert exc.value.status_code == 429


@pytest.mark.asyncio
async def test_rate_limit_is_noop_when_disabled() -> None:
    dependency = make_rate_limit_dependency(
        bucket=f"test-disabled-{uuid4().hex}",
        limit=0,
        window_seconds=60,
    )
    request = _request_for("20.20.20.20")
    await dependency(request)
    await dependency(request)
