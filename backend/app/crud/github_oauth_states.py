from __future__ import annotations

import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import delete, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.github_oauth_state import GitHubOAuthState


async def create_github_oauth_state(
    db: AsyncSession,
    *,
    organization_id: int | None,
    user_id: int,
    ttl_minutes: int = 15,
) -> GitHubOAuthState:
    state = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(minutes=ttl_minutes)
    row = GitHubOAuthState(
        organization_id=organization_id,
        user_id=user_id,
        state=state,
        expires_at=expires_at,
    )
    db.add(row)
    await db.commit()
    await db.refresh(row)
    return row


async def consume_github_oauth_state(
    db: AsyncSession,
    *,
    state: str,
) -> GitHubOAuthState | None:
    result = await db.execute(select(GitHubOAuthState).where(GitHubOAuthState.state == state))
    row = result.scalars().first()
    if row is None:
        return None

    if row.expires_at <= datetime.now(timezone.utc):
        await db.delete(row)
        await db.commit()
        return None

    # One-time use.
    await db.delete(row)
    await db.commit()
    return row


async def delete_expired_github_oauth_states(db: AsyncSession) -> int:
    res = await db.execute(
        delete(GitHubOAuthState).where(GitHubOAuthState.expires_at <= datetime.now(timezone.utc))
    )
    await db.commit()
    return int(res.rowcount or 0)
