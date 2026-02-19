from __future__ import annotations

import asyncio
from contextlib import asynccontextmanager
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPStatusError

from app.api.deps.auth import get_current_user
from app.api.deps.jobe import get_jobe_client
from app.api.deps.rate_limit import make_rate_limit_dependency
from app.core.config import settings
from app.integrations.jobe import JobeClient, JobeError
from app.schemas.playground import PlaygroundLanguage, PlaygroundRunRequest, PlaygroundRunResponse

router = APIRouter(prefix="/playground", dependencies=[Depends(get_current_user)])
execution_rate_limit = make_rate_limit_dependency(
    bucket="playground.run",
    limit=settings.rate_limit_execution_per_minute,
)
_playground_run_semaphore = asyncio.Semaphore(max(1, int(settings.playground_max_concurrent_runs)))


def _reset_playground_run_semaphore_for_tests(limit: int | None = None) -> None:
    global _playground_run_semaphore
    max_concurrent = (
        max(1, int(limit))
        if limit is not None
        else max(1, int(settings.playground_max_concurrent_runs))
    )
    _playground_run_semaphore = asyncio.Semaphore(max_concurrent)


@asynccontextmanager
async def _acquire_playground_run_slot():
    try:
        await asyncio.wait_for(
            _playground_run_semaphore.acquire(),
            timeout=float(settings.playground_queue_wait_seconds),
        )
    except TimeoutError as exc:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Playground is busy. Please try again shortly.",
        ) from exc
    try:
        yield
    finally:
        _playground_run_semaphore.release()


def _allowed_language_ids() -> set[str]:
    raw = settings.jobe_allowed_languages.strip()
    if not raw:
        return set()
    return {x.strip() for x in raw.split(",") if x.strip()}


@router.get("/languages", response_model=list[PlaygroundLanguage])
async def list_languages(
    jobe: Annotated[JobeClient, Depends(get_jobe_client)],
) -> list[PlaygroundLanguage]:
    try:
        languages = await jobe.list_languages()
    except HTTPStatusError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="JOBE error") from exc
    except JobeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    allowed = _allowed_language_ids()
    if allowed:
        languages = [lang for lang in languages if lang.id in allowed]

    return [PlaygroundLanguage(id=lang.id, version=lang.version) for lang in languages]


@router.post("/run", response_model=PlaygroundRunResponse)
async def run_code(
    payload: PlaygroundRunRequest,
    _rate_limit: Annotated[None, Depends(execution_rate_limit)],
    jobe: Annotated[JobeClient, Depends(get_jobe_client)],
) -> PlaygroundRunResponse:
    allowed = _allowed_language_ids()
    if allowed and payload.language_id not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language not allowed")

    try:
        async with _acquire_playground_run_slot():
            result = await jobe.run(
                language_id=payload.language_id,
                source_code=payload.source_code,
                stdin=payload.stdin,
            )
    except HTTPStatusError as exc:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail="JOBE error") from exc
    except JobeError as exc:
        raise HTTPException(status_code=status.HTTP_503_SERVICE_UNAVAILABLE, detail=str(exc)) from exc

    return PlaygroundRunResponse(
        outcome=result.outcome,
        compile_output=result.compile_output,
        stdout=result.stdout,
        stderr=result.stderr,
    )
