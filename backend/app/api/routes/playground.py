from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from httpx import HTTPStatusError

from app.api.deps.auth import get_current_user
from app.api.deps.jobe import get_jobe_client
from app.core.config import settings
from app.integrations.jobe import JobeClient, JobeError
from app.schemas.playground import PlaygroundLanguage, PlaygroundRunRequest, PlaygroundRunResponse

router = APIRouter(prefix="/playground", dependencies=[Depends(get_current_user)])


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
    jobe: Annotated[JobeClient, Depends(get_jobe_client)],
) -> PlaygroundRunResponse:
    allowed = _allowed_language_ids()
    if allowed and payload.language_id not in allowed:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Language not allowed")

    try:
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
