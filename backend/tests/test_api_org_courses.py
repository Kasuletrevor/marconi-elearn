import pytest


async def _login_admin(client) -> None:
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_org_courses_crud(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": "Basics"},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.get(f"/api/v1/orgs/{org_id}/courses")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.get(f"/api/v1/orgs/{org_id}/courses/{course_id}")
    assert r.status_code == 200
    assert r.json()["code"] == "CS101"

    r = await client.patch(f"/api/v1/orgs/{org_id}/courses/{course_id}", json={"title": "Intro 2"})
    assert r.status_code == 200
    assert r.json()["title"] == "Intro 2"

    r = await client.delete(f"/api/v1/orgs/{org_id}/courses/{course_id}")
    assert r.status_code == 204

    r = await client.get(f"/api/v1/orgs/{org_id}/courses")
    assert r.status_code == 200
    assert r.json() == []
