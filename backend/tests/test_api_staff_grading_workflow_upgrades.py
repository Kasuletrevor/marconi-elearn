from io import BytesIO

import pytest


@pytest.mark.asyncio
async def test_staff_queue_upgrades_pagination_bulk_next_and_missing(client):
    # Admin creates org/course/assignment and enrolls two students
    r = await client.post("/api/v1/users", json={"email": "admin2@example.com", "password": "password123"})
    assert r.status_code == 201
    r = await client.post("/api/v1/auth/login", json={"email": "admin2@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org B"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "OOP201", "title": "OOP", "description": None, "semester": "Sem 2", "year": 2026},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud3@example.com", "password": "password123"})
    assert r.status_code == 201
    stud1_id = r.json()["id"]
    r = await client.post("/api/v1/users", json={"email": "stud4@example.com", "password": "password123"})
    assert r.status_code == 201
    stud2_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud1_id, "role": "student"},
    )
    assert r.status_code == 201
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud2_id, "role": "student"},
    )
    assert r.status_code == 201

    # Student 1 submits
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud3@example.com", "password": "password123"})
    assert r.status_code == 200
    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    # Admin checks paginated queue and "next ungraded"
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin2@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get(f"/api/v1/staff/submissions/page?course_id={course_id}&offset=0&limit=1")
    assert r.status_code == 200
    payload = r.json()
    assert payload["total"] == 1
    assert payload["items"][0]["id"] == submission_id

    r = await client.get(f"/api/v1/staff/submissions/next?course_id={course_id}")
    assert r.status_code == 200
    assert r.json()["submission_id"] == submission_id

    # Bulk mark graded
    r = await client.post(
        "/api/v1/staff/submissions/bulk",
        json={"submission_ids": [submission_id], "action": "mark_graded"},
    )
    assert r.status_code == 200
    assert r.json()["updated_ids"] == [submission_id]

    # Missing submissions summary + detail (student 2)
    r = await client.get(f"/api/v1/staff/courses/{course_id}/missing-submissions")
    assert r.status_code == 200
    summary = r.json()
    assert any(s["assignment_id"] == assignment_id and s["missing_count"] == 1 for s in summary)

    r = await client.get(f"/api/v1/staff/courses/{course_id}/missing-submissions/{assignment_id}")
    assert r.status_code == 200
    missing = r.json()
    assert len(missing) == 1
    assert missing[0]["email"] == "stud4@example.com"

    # Student 1 receives a "graded" notification from bulk update
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud3@example.com", "password": "password123"})
    assert r.status_code == 200
    r = await client.get("/api/v1/student/notifications?unread_only=true")
    assert r.status_code == 200
    assert any(n["kind"] == "submission_graded" for n in r.json())

