from io import BytesIO

import pytest


async def _create_admin_org_course_with_content(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "Intro", "description": None})
    course_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses/{course_id}/modules", json={"title": "Week 1", "position": 1})
    module_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": module_id},
    )
    assignment_id = r.json()["id"]

    return org_id, course_id, module_id, assignment_id


@pytest.mark.asyncio
async def test_student_can_list_their_courses_modules_assignments(client):
    org_id, course_id, _module_id, _assignment_id = await _create_admin_org_course_with_content(client)

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

    r = await client.get("/api/v1/student/courses")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == course_id

    r = await client.get(f"/api/v1/student/courses/{course_id}/modules")
    assert r.status_code == 200
    assert len(r.json()) == 1

    r = await client.get(f"/api/v1/student/courses/{course_id}/assignments")
    assert r.status_code == 200
    assert len(r.json()) == 1

    assignment_id = r.json()[0]["id"]
    r = await client.get(f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions")
    assert r.status_code == 200
    assert r.json() == []


@pytest.mark.asyncio
async def test_student_cannot_view_unenrolled_course(client):
    _org_id, course_id, _module_id, assignment_id = await _create_admin_org_course_with_content(client)

    r = await client.post("/api/v1/users", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 201
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get(f"/api/v1/student/courses/{course_id}/modules")
    assert r.status_code == 403

    r = await client.get(f"/api/v1/student/courses/{course_id}/assignments")
    assert r.status_code == 403

    r = await client.post(
        f"/api/v1/orgs/1/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}"), "text/x-c")},
    )
    assert r.status_code == 403

    r = await client.get(f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions")
    assert r.status_code == 403
