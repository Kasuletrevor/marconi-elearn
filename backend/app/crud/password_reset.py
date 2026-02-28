"""CRUD operations for password reset tokens."""

from __future__ import annotations

import hashlib
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import func, select, update
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.password_reset_token import PasswordResetToken


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_password_reset_token(
    db: AsyncSession,
    *,
    user_id: int,
    expires_in_minutes: int = 60,
) -> str | None:
    """Create a password reset token. Returns the raw (unhashed) token."""
    now = datetime.now(timezone.utc)
    window_start = now - timedelta(hours=1)
    recent_count_result = await db.execute(
        select(func.count())
        .select_from(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.created_at >= window_start,
        )
    )
    recent_count = int(recent_count_result.scalar_one() or 0)
    if recent_count >= 3:
        return None

    # Keep only one active token at a time.
    await db.execute(
        update(PasswordResetToken)
        .where(
            PasswordResetToken.user_id == user_id,
            PasswordResetToken.used_at.is_(None),
        )
        .values(used_at=now)
    )

    token = secrets.token_urlsafe(32)
    expires_at = now + timedelta(minutes=expires_in_minutes)
    reset = PasswordResetToken(
        user_id=user_id,
        token_hash=_hash_token(token),
        expires_at=expires_at,
    )
    db.add(reset)
    await db.commit()
    return token


async def get_valid_reset_token(
    db: AsyncSession,
    *,
    token: str,
) -> PasswordResetToken | None:
    """Look up a reset token and return it only if it's unused and not expired."""
    token_hash = _hash_token(token)
    result = await db.execute(
        select(PasswordResetToken).where(
            PasswordResetToken.token_hash == token_hash,
            PasswordResetToken.used_at.is_(None),
        )
    )
    reset = result.scalars().first()
    if reset is None:
        return None
    if reset.expires_at <= datetime.now(timezone.utc):
        return None
    return reset


async def mark_reset_token_used(
    db: AsyncSession,
    *,
    reset_token: PasswordResetToken,
) -> None:
    reset_token.used_at = datetime.now(timezone.utc)
    await db.commit()
