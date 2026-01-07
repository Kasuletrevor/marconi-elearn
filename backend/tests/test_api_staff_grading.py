from io import BytesIO

import pytest


@pytest.mark.asyncio
async def test_staff_submissions_queue_grade_and_download(client):
    # Admin creates org/course/assignment and enrolls a student
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": None, "semester": "Sem 1", "year": 2026},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    # Student submits
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    # Admin (course owner) sees it in queue and grades it
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get("/api/v1/staff/submissions?status_filter=pending")
    assert r.status_code == 200
    assert any(s["id"] == submission_id for s in r.json())

    r = await client.patch(f"/api/v1/staff/submissions/{submission_id}", json={"score": 8, "feedback": "Good job"})
    assert r.status_code == 200
    assert r.json()["status"] == "graded"
    assert r.json()["score"] == 8

    r = await client.get(f"/api/v1/staff/submissions/{submission_id}")
    assert r.status_code == 200
    assert r.json()["assignment_id"] == assignment_id
    assert r.json()["course_id"] == course_id
    assert r.json()["student_email"] == "stud@example.com"

    r = await client.get(f"/api/v1/staff/submissions/{submission_id}/download")
    assert r.status_code == 200
    assert r.content == b"int main(){return 0;}\n"


@pytest.mark.asyncio
async def test_students_cannot_access_staff_submissions(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/users", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 201
    await client.post("/api/v1/auth/logout")

    r = await client.post("/api/v1/auth/login", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get("/api/v1/staff/submissions")
    assert r.status_code == 200
    assert r.json() == []

    r = await client.get("/api/v1/staff/submissions/12345")
    assert r.status_code in (403, 404)
