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

    r = await client.get(f"/api/v1/student/courses/{course_id}")
    assert r.status_code == 200
    assert r.json()["id"] == course_id

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
async def test_student_assignments_include_effective_due_date_and_extension_flag(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Extensions Org"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS210", "title": "Algorithms"},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    due_date = "2030-03-10T12:00:00Z"
    extension_due_date = "2030-03-12T09:30:00Z"
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "Homework 1", "due_date": due_date},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "ext-stud@example.com", "password": "password123"})
    assert r.status_code == 201
    student_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201

    r = await client.put(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/extensions/{student_id}",
        json={"extended_due_date": extension_due_date},
    )
    assert r.status_code == 200

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "ext-stud@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.get(f"/api/v1/student/courses/{course_id}/assignments")
    assert r.status_code == 200
    assignments = r.json()
    assert len(assignments) == 1
    assignment = assignments[0]
    assert assignment["id"] == assignment_id
    assert assignment["due_date"].startswith("2030-03-10")
    assert assignment["effective_due_date"].startswith("2030-03-12")
    assert assignment["has_extension"] is True


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
