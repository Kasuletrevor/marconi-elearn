from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated

import httpx
from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import RedirectResponse
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.core.crypto import TokenCryptoNotConfiguredError
from app.crud.github_oauth_states import create_github_oauth_state, consume_github_oauth_state
from app.crud.org_github_admin_tokens import (
    get_best_org_github_admin_token,
    list_org_github_admin_tokens,
    revoke_org_github_admin_token,
    upsert_org_github_admin_token,
)
from app.core.config import settings
from app.crud.organizations import get_organization
from app.db.deps import get_db
from app.integrations.github import (
    GitHubIntegrationNotConfiguredError,
    build_authorize_url,
    exchange_code_for_token,
    get_viewer,
    list_classrooms,
    refresh_token as refresh_github_token,
)
from app.models.user import User

router = APIRouter(prefix="/orgs/{org_id}/integrations/github", tags=["integrations"])


@router.get("/connect")
async def github_connect_start(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> RedirectResponse:
    try:
        # Fail fast if we can't store tokens securely.
        from app.core.crypto import encrypt_token

        encrypt_token("probe")
        state_row = await create_github_oauth_state(db, organization_id=org_id, user_id=current_user.id)
        url = build_authorize_url(state=state_row.state)
        return RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except (GitHubIntegrationNotConfiguredError, TokenCryptoNotConfiguredError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@router.get("/status")
async def github_status(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> dict:
    org = await get_organization(db, org_id=org_id)
    tokens = await list_org_github_admin_tokens(db, organization_id=org_id)
    return {
        "github_org_login": org.github_org_login if org else None,
        "connected_admins": [
            {
                "user_id": t.user_id,
                "github_user_id": t.github_user_id,
                "github_login": t.github_login,
                "token_expires_at": t.token_expires_at,
                "last_verified_at": t.last_verified_at,
                "revoked_at": t.revoked_at,
            }
            for t in tokens
        ],
    }


@router.post("/disconnect", status_code=status.HTTP_204_NO_CONTENT)
async def github_disconnect(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> None:
    await revoke_org_github_admin_token(db, organization_id=org_id, user_id=current_user.id)
    return None


callback_router = APIRouter(prefix="/integrations/github", tags=["integrations"])


@callback_router.get("/user/connect")
async def github_user_connect_start(
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RedirectResponse:
    try:
        state_row = await create_github_oauth_state(db, organization_id=None, user_id=current_user.id)
        url = build_authorize_url(state=state_row.state)
        return RedirectResponse(url=url, status_code=status.HTTP_307_TEMPORARY_REDIRECT)
    except GitHubIntegrationNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc


@callback_router.get("/user/status")
async def github_user_status(
    current_user: Annotated[User, Depends(get_current_user)],
) -> dict:
    return {
        "connected": bool(current_user.github_user_id and current_user.github_login),
        "github_user_id": current_user.github_user_id,
        "github_login": current_user.github_login,
        "github_connected_at": current_user.github_connected_at,
    }


@callback_router.get("/callback")
async def github_oauth_callback(
    code: str,
    state: str,
    db: Annotated[AsyncSession, Depends(get_db)],
    current_user: Annotated[User, Depends(get_current_user)],
) -> RedirectResponse:
    row = await consume_github_oauth_state(db, state=state)
    if row is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid or expired state")
    if row.user_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="User mismatch")

    try:
        token_set = await exchange_code_for_token(code=code)
        viewer = await get_viewer(access_token=token_set.access_token)
        if row.organization_id is None:
            current_user.github_user_id = int(viewer["id"])
            current_user.github_login = str(viewer["login"])
            current_user.github_connected_at = datetime.now(timezone.utc)
            await db.commit()
        else:
            await upsert_org_github_admin_token(
                db,
                organization_id=row.organization_id,
                user_id=row.user_id,
                github_user_id=int(viewer["id"]),
                github_login=str(viewer["login"]),
                access_token=token_set.access_token,
                refresh_token=token_set.refresh_token,
                token_expires_at=token_set.expires_at,
                refresh_token_expires_at=token_set.refresh_token_expires_at,
            )
    except (GitHubIntegrationNotConfiguredError, TokenCryptoNotConfiguredError) as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    # Redirect back to frontend admin settings (best-effort).
    origin = (settings.cors_allow_origins.split(",")[0] or "http://localhost:3000").strip()
    if row.organization_id is None:
        url = f"{origin}/dashboard/settings?github=connected"
    else:
        url = f"{origin}/admin/settings?org_id={row.organization_id}&github=connected"
    return RedirectResponse(url=url, status_code=status.HTTP_303_SEE_OTHER)


@router.post("/verify")
async def github_verify_org_token(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_admin: Annotated[None, Depends(require_org_admin)],
) -> dict:
    token_row = await get_best_org_github_admin_token(db, organization_id=org_id)
    if token_row is None:
        return {"ok": False, "detail": "No connected GitHub admin"}

    # Refresh if needed.
    try:
        from app.core.crypto import decrypt_token

        access_token = decrypt_token(token_row.access_token_enc)
        refresh_token = decrypt_token(token_row.refresh_token_enc)
    except TokenCryptoNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if token_row.token_expires_at <= datetime.now(timezone.utc):
        token_set = await refresh_github_token(refresh_token=refresh_token)
        viewer = await get_viewer(access_token=token_set.access_token)
        await upsert_org_github_admin_token(
            db,
            organization_id=token_row.organization_id,
            user_id=token_row.user_id,
            github_user_id=int(viewer["id"]),
            github_login=str(viewer["login"]),
            access_token=token_set.access_token,
            refresh_token=token_set.refresh_token,
            token_expires_at=token_set.expires_at,
            refresh_token_expires_at=token_set.refresh_token_expires_at,
        )
        access_token = token_set.access_token

    # Probe classrooms access.
    try:
        classrooms = await list_classrooms(access_token=access_token)
    except httpx.HTTPStatusError as exc:
        return {"ok": False, "detail": f"GitHub API error: {exc.response.status_code}"}

    return {"ok": True, "classroom_count": len(classrooms)}
