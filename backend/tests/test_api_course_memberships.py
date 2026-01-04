import pytest


async def _login_admin(client, email: str = "admin@example.com") -> None:
    r = await client.post("/api/v1/users", json={"email": email, "password": "password123"})
    assert r.status_code == 201
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": "password123"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_course_membership_enroll_and_list(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "Intro", "description": None})
    course_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "s1@example.com", "password": "password123"})
    student_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201

    r = await client.get(f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships")
    assert r.status_code == 200
    roles = {m["role"] for m in r.json()}
    assert "owner" in roles
    assert "student" in roles


@pytest.mark.asyncio
async def test_student_can_submit_but_cannot_list_submissions(client):
    await _login_admin(client, email="admin2@example.com")
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "Intro", "description": None})
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": None, "module_id": None},
    )
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    student_id = r.json()["id"]
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", b"int main(){return 0;}\n", "text/x-c")},
    )
    assert r.status_code == 201

    r = await client.get(f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments/{assignment_id}/submissions")
    assert r.status_code == 403

