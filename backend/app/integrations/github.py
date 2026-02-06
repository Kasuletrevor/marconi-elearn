from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime, timedelta, timezone
from typing import Any

import httpx

from app.core.config import settings


class GitHubIntegrationNotConfiguredError(RuntimeError):
    pass


@dataclass(frozen=True)
class GitHubTokenSet:
    access_token: str
    refresh_token: str
    expires_at: datetime
    refresh_token_expires_at: datetime | None


def _require_github_app_configured() -> None:
    if not settings.github_app_client_id.strip():
        raise GitHubIntegrationNotConfiguredError("GITHUB_APP_CLIENT_ID is not configured")
    if not settings.github_app_client_secret.strip():
        raise GitHubIntegrationNotConfiguredError("GITHUB_APP_CLIENT_SECRET is not configured")
    if not settings.github_app_oauth_redirect_url.strip():
        raise GitHubIntegrationNotConfiguredError("GITHUB_APP_OAUTH_REDIRECT_URL is not configured")


def build_authorize_url(*, state: str) -> str:
    _require_github_app_configured()
    params = {
        "client_id": settings.github_app_client_id,
        "redirect_uri": settings.github_app_oauth_redirect_url,
        "state": state,
    }
    return str(httpx.URL("https://github.com/login/oauth/authorize").copy_merge_params(params))


async def exchange_code_for_token(*, code: str) -> GitHubTokenSet:
    _require_github_app_configured()
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_app_client_id,
                "client_secret": settings.github_app_client_secret,
                "code": code,
                "redirect_uri": settings.github_app_oauth_redirect_url,
            },
        )
        res.raise_for_status()
        data = res.json()

    access_token = data.get("access_token")
    refresh_token = data.get("refresh_token")
    expires_in = data.get("expires_in")
    refresh_token_expires_in = data.get("refresh_token_expires_in")
    if not access_token or not refresh_token or not expires_in:
        raise GitHubIntegrationNotConfiguredError("GitHub token exchange failed")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=int(expires_in))
    refresh_expires_at = (
        now + timedelta(seconds=int(refresh_token_expires_in))
        if refresh_token_expires_in is not None
        else None
    )
    return GitHubTokenSet(
        access_token=str(access_token),
        refresh_token=str(refresh_token),
        expires_at=expires_at,
        refresh_token_expires_at=refresh_expires_at,
    )


async def refresh_token(*, refresh_token: str) -> GitHubTokenSet:
    _require_github_app_configured()
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.post(
            "https://github.com/login/oauth/access_token",
            headers={"Accept": "application/json"},
            data={
                "client_id": settings.github_app_client_id,
                "client_secret": settings.github_app_client_secret,
                "grant_type": "refresh_token",
                "refresh_token": refresh_token,
            },
        )
        res.raise_for_status()
        data = res.json()

    access_token = data.get("access_token")
    new_refresh_token = data.get("refresh_token") or refresh_token
    expires_in = data.get("expires_in")
    refresh_token_expires_in = data.get("refresh_token_expires_in")
    if not access_token or not expires_in:
        raise GitHubIntegrationNotConfiguredError("GitHub token refresh failed")

    now = datetime.now(timezone.utc)
    expires_at = now + timedelta(seconds=int(expires_in))
    refresh_expires_at = (
        now + timedelta(seconds=int(refresh_token_expires_in))
        if refresh_token_expires_in is not None
        else None
    )
    return GitHubTokenSet(
        access_token=str(access_token),
        refresh_token=str(new_refresh_token),
        expires_at=expires_at,
        refresh_token_expires_at=refresh_expires_at,
    )


async def get_viewer(*, access_token: str) -> dict[str, Any]:
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            "https://api.github.com/user",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        res.raise_for_status()
        data = res.json()
        return {"id": int(data["id"]), "login": str(data["login"])}


async def list_classrooms(*, access_token: str) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            "https://api.github.com/classrooms",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        res.raise_for_status()
        return list(res.json())


async def list_classroom_assignments(*, access_token: str, classroom_id: int) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            f"https://api.github.com/classrooms/{classroom_id}/assignments",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        res.raise_for_status()
        return list(res.json())


async def list_accepted_assignments(*, access_token: str, assignment_id: int) -> list[dict[str, Any]]:
    async with httpx.AsyncClient(timeout=20) as client:
        res = await client.get(
            f"https://api.github.com/assignments/{assignment_id}/accepted_assignments",
            headers={
                "Accept": "application/vnd.github+json",
                "Authorization": f"Bearer {access_token}",
                "X-GitHub-Api-Version": "2022-11-28",
            },
        )
        res.raise_for_status()
        return list(res.json())
