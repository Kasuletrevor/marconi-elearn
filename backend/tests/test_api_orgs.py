import pytest


@pytest.mark.asyncio
async def test_orgs_crud(client):
    await client.get("/api/v1/health")

    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201

    r = await client.get("/api/v1/orgs")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    org_id = data[0]["id"]

    r = await client.patch(f"/api/v1/orgs/{org_id}", json={"name": "Org B"})
    assert r.status_code == 200
    assert r.json()["name"] == "Org B"

    r = await client.delete(f"/api/v1/orgs/{org_id}")
    assert r.status_code == 204


@pytest.mark.asyncio
async def test_auth_login_me_logout(client):
    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_org_endpoints_require_auth(client):
    r = await client.post("/api/v1/orgs", json={"name": "X"})
    assert r.status_code == 401

    r = await client.get("/api/v1/orgs")
    assert r.status_code == 401

    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/users", json={"email": "a@example.com", "password": "password123"})
    assert r.status_code == 201

    r = await client.post("/api/v1/auth/logout")
    assert r.status_code == 204

    r = await client.post("/api/v1/auth/login", json={"email": "a@example.com", "password": "password123"})
    assert r.status_code == 200
    assert "set-cookie" in r.headers

    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 200
    data = r.json()
    assert data["email"] == "a@example.com"
    assert data["is_superadmin"] is False
    assert data["org_admin_of"] == []
    assert data["course_roles"] == []

    r = await client.post("/api/v1/auth/logout")
    assert r.status_code == 204

    r = await client.get("/api/v1/auth/me")
    assert r.status_code == 401
