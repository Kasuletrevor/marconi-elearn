import pytest


@pytest.mark.asyncio
async def test_superadmin_stats_endpoint_returns_counts(client):
    # superadmin is bootstrapped in tests via env (see tests/conftest.py)
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.get("/api/v1/superadmin/stats")
    assert r.status_code == 200
    data = r.json()
    assert data["organizations_total"] >= 0
    assert data["users_total"] >= 1
    assert data["courses_total"] >= 0
    assert data["submissions_total"] >= 0
    assert data["submissions_today"] >= 0

