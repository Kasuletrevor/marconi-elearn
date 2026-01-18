import hashlib
from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select, update

from app.core.config import settings
from app.models.session import Session


@pytest.mark.asyncio
async def test_expired_session_is_rejected_and_deleted(client, db):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    token = client.cookies.get(settings.session_cookie_name)
    assert token

    token_hash = hashlib.sha256(token.encode("utf-8")).hexdigest()
    expired_at = datetime.now(timezone.utc) - timedelta(seconds=1)

    await db.execute(
        update(Session)
        .where(Session.token_hash == token_hash)
        .values(expires_at=expired_at)
    )
    await db.commit()

    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401

    # The auth dependency should clean up the expired row.
    result = await db.execute(select(Session).where(Session.token_hash == token_hash))
    assert result.scalars().first() is None

