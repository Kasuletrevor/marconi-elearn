from io import BytesIO

import pytest


async def _login_admin(client) -> None:
    r = await client.post("/api/v1/users", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 201
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_modules_assignments_and_submissions_flow(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": None},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/modules",
        json={"title": "Week 1", "position": 1},
    )
    assert r.status_code == 201
    module_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": module_id},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    file_bytes = BytesIO(b"int main(){return 0;}\n")
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", file_bytes, "text/x-c")},
    )
    assert r.status_code == 201
    assert r.json()["file_name"] == "main.c"
    assert r.json()["assignment_id"] == assignment_id

    r = await client.get(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments/{assignment_id}/submissions"
    )
    assert r.status_code == 200
    assert len(r.json()) == 1


@pytest.mark.asyncio
async def test_submission_rejects_bad_extension(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": None},
    )
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": None, "module_id": None},
    )
    assignment_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("payload.exe", BytesIO(b"x"), "application/octet-stream")},
    )
    assert r.status_code == 400

