import pytest


async def _login_superadmin(client) -> None:
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_users_crud(client):
    await client.get("/api/v1/health")
    await _login_superadmin(client)

    r = await client.post(
        "/api/v1/users",
        json={"email": "user@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    user_data = r.json()
    assert user_data["email"] == "user@example.com"
    assert "password_hash" not in user_data
    user_id = user_data["id"]

    r = await client.get("/api/v1/users")
    assert r.status_code == 200
    users = r.json()
    assert len(users) == 2
    assert user_id in {u["id"] for u in users}

    r = await client.get(f"/api/v1/users/{user_id}")
    assert r.status_code == 200
    fetched_user = r.json()
    assert fetched_user["email"] == "user@example.com"

    r = await client.get("/api/v1/users/999")
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_duplicate_email_returns_409(client):
    await _login_superadmin(client)
    payload = {"email": "dupe@example.com", "password": "password123"}

    r = await client.post("/api/v1/users", json=payload)
    assert r.status_code == 201

    r = await client.post("/api/v1/users", json=payload)
    assert r.status_code == 409
    assert "already exists" in r.json()["detail"]


@pytest.mark.asyncio
async def test_list_users_pagination(client):
    await _login_superadmin(client)
    for i in range(3):
        await client.post(
            "/api/v1/users",
            json={"email": f"user{i}@example.com", "password": "password123"},
        )

    r = await client.get("/api/v1/users?offset=0&limit=2")
    assert r.status_code == 200
    users = r.json()
    assert len(users) == 2

    r = await client.get("/api/v1/users?offset=2&limit=2")
    assert r.status_code == 200
    users = r.json()
    assert len(users) == 2
