import pytest


async def _login_admin(client) -> None:
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_org_memberships_crud(client):
    await client.get("/api/v1/health")

    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Test Org"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "member@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    user_id = r.json()["id"]

    r = await client.get(f"/api/v1/orgs/{org_id}/users/lookup?email=member@example.com")
    assert r.status_code == 200
    assert r.json()["id"] == user_id
    assert r.json()["email"] == "member@example.com"

    r = await client.post(
        f"/api/v1/orgs/{org_id}/memberships",
        json={"user_id": user_id, "role": "lecturer"},
    )
    assert r.status_code == 201
    membership_data = r.json()
    assert membership_data["organization_id"] == org_id
    assert membership_data["user_id"] == user_id
    assert membership_data["role"] == "lecturer"
    membership_id = membership_data["id"]

    r = await client.get(f"/api/v1/orgs/{org_id}/memberships")
    assert r.status_code == 200
    memberships = r.json()
    assert len(memberships) == 2
    assert membership_id in {m["id"] for m in memberships}

    r = await client.patch(
        f"/api/v1/orgs/{org_id}/memberships/{membership_id}",
        json={"role": "admin"},
    )
    assert r.status_code == 200
    updated = r.json()
    assert updated["role"] == "admin"

    r = await client.delete(f"/api/v1/orgs/{org_id}/memberships/{membership_id}")
    assert r.status_code == 204

    r = await client.get(f"/api/v1/orgs/{org_id}/memberships")
    assert r.status_code == 200
    memberships = r.json()
    assert len(memberships) == 1


@pytest.mark.asyncio
async def test_duplicate_membership_returns_409(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Test Org"})
    org_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "member@example.com", "password": "password123"},
    )
    user_id = r.json()["id"]

    payload = {"user_id": user_id, "role": "lecturer"}

    r = await client.post(f"/api/v1/orgs/{org_id}/memberships", json=payload)
    assert r.status_code == 201

    r = await client.post(f"/api/v1/orgs/{org_id}/memberships", json=payload)
    assert r.status_code == 409
    assert "already in organization" in r.json()["detail"]


@pytest.mark.asyncio
async def test_membership_not_found_for_different_org(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org 1"})
    org1_id = r.json()["id"]

    r = await client.post("/api/v1/orgs", json={"name": "Org 2"})
    org2_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "member@example.com", "password": "password123"},
    )
    user_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org1_id}/memberships",
        json={"user_id": user_id, "role": "lecturer"},
    )
    membership_id = r.json()["id"]

    r = await client.patch(
        f"/api/v1/orgs/{org2_id}/memberships/{membership_id}",
        json={"role": "admin"},
    )
    assert r.status_code == 404
    assert "not found" in r.json()["detail"]

    r = await client.delete(f"/api/v1/orgs/{org2_id}/memberships/{membership_id}")
    assert r.status_code == 404
    assert "not found" in r.json()["detail"]


@pytest.mark.asyncio
async def test_list_memberships_pagination(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Test Org"})
    org_id = r.json()["id"]

    for i in range(3):
        r = await client.post(
            "/api/v1/users",
            json={"email": f"user{i}@example.com", "password": "password123"},
        )
        user_id = r.json()["id"]
        await client.post(
            f"/api/v1/orgs/{org_id}/memberships",
            json={"user_id": user_id, "role": "lecturer"},
        )

    r = await client.get(f"/api/v1/orgs/{org_id}/memberships?offset=0&limit=2")
    assert r.status_code == 200
    memberships = r.json()
    assert len(memberships) == 2

    r = await client.get(f"/api/v1/orgs/{org_id}/memberships?offset=2&limit=2")
    assert r.status_code == 200
    memberships = r.json()
    assert len(memberships) == 2
