import pytest


async def _setup_org_course(client, *, org_name: str, code: str, title: str) -> tuple[int, int]:
    r = await client.post("/api/v1/orgs", json={"name": org_name})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": code, "title": title},
    )
    assert r.status_code == 201
    return org_id, r.json()["id"]


@pytest.mark.asyncio
async def test_student_calendar_events_include_effective_due_dates(client):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    org_id, course_id = await _setup_org_course(
        client,
        org_name="Calendar Org",
        code="CS201",
        title="Data Structures",
    )

    due_a = "2030-01-10T10:00:00Z"
    due_b = "2030-01-20T12:00:00Z"
    ext_due_a = "2030-01-12T09:00:00Z"

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "Assignment A", "due_date": due_a},
    )
    assert r.status_code == 201
    assignment_a_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "Assignment B", "due_date": due_b},
    )
    assert r.status_code == 201
    assignment_b_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "student-calendar@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    student_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201

    r = await client.put(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_a_id}/extensions/{student_id}",
        json={"extended_due_date": ext_due_a},
    )
    assert r.status_code == 200

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "student-calendar@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.get("/api/v1/student/calendar/events")
    assert r.status_code == 200
    payload = r.json()
    assert len(payload) == 2
    by_assignment = {row["assignment_id"]: row for row in payload}

    assignment_a = by_assignment[assignment_a_id]
    assert assignment_a["due_date"].startswith("2030-01-10")
    assert assignment_a["effective_due_date"].startswith("2030-01-12")
    assert assignment_a["has_extension"] is True

    assignment_b = by_assignment[assignment_b_id]
    assert assignment_b["due_date"].startswith("2030-01-20")
    assert assignment_b["effective_due_date"].startswith("2030-01-20")
    assert assignment_b["has_extension"] is False

    r = await client.get(
        "/api/v1/student/calendar/events",
        params={"starts_at": "2030-01-15T00:00:00Z"},
    )
    assert r.status_code == 200
    filtered = r.json()
    assert len(filtered) == 1
    assert filtered[0]["assignment_id"] == assignment_b_id

    r = await client.get(
        "/api/v1/student/calendar/events",
        params={"starts_at": "2030-01-20T00:00:00Z", "ends_at": "2030-01-10T00:00:00Z"},
    )
    assert r.status_code == 400


@pytest.mark.asyncio
async def test_staff_calendar_events_require_staff_role_for_course_filter(client):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    org_id, staff_course_id = await _setup_org_course(
        client,
        org_name="Staff Calendar Org",
        code="CS301",
        title="Systems Programming",
    )
    org_id_two, student_course_id = await _setup_org_course(
        client,
        org_name="Another Org",
        code="CS302",
        title="Networks",
    )

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{staff_course_id}/assignments",
        json={"title": "Kernel Lab", "due_date": "2031-02-03T14:00:00Z"},
    )
    assert r.status_code == 201
    staff_assignment_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id_two}/courses/{student_course_id}/assignments",
        json={"title": "Socket Lab", "due_date": "2031-02-04T14:00:00Z"},
    )
    assert r.status_code == 201

    r = await client.post(
        "/api/v1/users",
        json={"email": "ta-calendar@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    ta_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/memberships",
        json={"user_id": ta_id, "role": "ta"},
    )
    assert r.status_code == 201
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{staff_course_id}/memberships",
        json={"user_id": ta_id, "role": "ta"},
    )
    assert r.status_code == 201
    r = await client.post(
        f"/api/v1/orgs/{org_id_two}/courses/{student_course_id}/memberships",
        json={"user_id": ta_id, "role": "student"},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "ta-calendar@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.get("/api/v1/staff/calendar/events")
    assert r.status_code == 200
    payload = r.json()
    assert len(payload) == 1
    assert payload[0]["assignment_id"] == staff_assignment_id

    r = await client.get(
        "/api/v1/staff/calendar/events",
        params={"course_id": student_course_id},
    )
    assert r.status_code == 403
