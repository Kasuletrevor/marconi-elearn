from io import BytesIO

import pytest


@pytest.mark.asyncio
async def test_staff_can_publish_resource_and_student_can_view_and_get_notification(client):
    # Admin creates org/course/module and enrolls a student
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
        f"/api/v1/orgs/{org_id}/courses/{course_id}/modules",
        json={"title": "Week 1", "position": 1},
    )
    assert r.status_code == 201
    module_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    # Staff creates a link resource but keeps it unpublished
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/modules/{module_id}/resources/link",
        json={"title": "Syllabus", "url": "https://example.com/syllabus", "position": 1, "is_published": False},
    )
    assert r.status_code == 201
    resource_id = r.json()["id"]

    # Student cannot see it yet
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get(f"/api/v1/student/courses/{course_id}/modules/{module_id}/resources")
    assert r.status_code == 200
    assert r.json() == []

    # Staff publishes it
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}/modules/{module_id}/resources/{resource_id}",
        json={"is_published": True},
    )
    assert r.status_code == 200
    assert r.json()["is_published"] is True

    # Student can now see it
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get(f"/api/v1/student/courses/{course_id}/modules/{module_id}/resources")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["title"] == "Syllabus"

    # Student submits; staff grades; student gets notification
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": None, "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.patch(f"/api/v1/staff/submissions/{submission_id}", json={"score": 9})
    assert r.status_code == 200
    assert r.json()["status"] == "graded"

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get("/api/v1/student/notifications?unread_only=true")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["kind"] == "submission_graded"


@pytest.mark.asyncio
async def test_student_can_list_and_download_their_submissions(client):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org B"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "Intro", "description": None})
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": None, "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    r = await client.get("/api/v1/student/submissions")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == submission_id
    assert r.json()[0]["course_id"] == course_id
    assert r.json()[0]["assignment_id"] == assignment_id

    r = await client.get(f"/api/v1/student/submissions/{submission_id}/download")
    assert r.status_code == 200
    assert r.content == b"int main(){return 0;}\n"


@pytest.mark.asyncio
async def test_staff_gets_new_submissions_digest_and_can_disable_per_course(client):
    # Admin creates org/course/assignment and enrolls a student
    r = await client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"}
    )
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org C"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS102", "title": "Course", "description": None, "semester": "Sem 1", "year": 2026},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": None, "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud3@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    # Student submits twice quickly -> staff should get a single digest notification
    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login", json={"email": "stud3@example.com", "password": "password123"}
    )
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"}
    )
    assert r.status_code == 200

    r = await client.get("/api/v1/student/notifications?unread_only=true&limit=50")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["kind"] == "submissions_received"
    assert "New submissions (" in r.json()[0]["title"]
    assert "course_id=" in (r.json()[0]["link_url"] or "")

    # Mark it read, disable per-course, then submit again -> no new staff notification
    notif_id = r.json()[0]["id"]
    r = await client.post(f"/api/v1/student/notifications/{notif_id}/read")
    assert r.status_code == 200

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}/notification-preferences",
        json={"notify_new_submissions": False},
    )
    assert r.status_code == 200
    assert r.json()["notify_new_submissions"] is False

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login", json={"email": "stud3@example.com", "password": "password123"}
    )
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"}
    )
    assert r.status_code == 200

    r = await client.get("/api/v1/student/notifications?unread_only=true&limit=50")
    assert r.status_code == 200
    assert r.json() == []
