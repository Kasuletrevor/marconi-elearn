import pytest


@pytest.mark.asyncio
async def test_staff_memberships_enroll_and_remove_permissions(client):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro"},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "ta@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    ta_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "student@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    student_id = r.json()["id"]

    # Admin enrolls TA (staff add is instructor-only)
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": ta_id, "role": "ta"},
    )
    assert r.status_code == 201
    ta_membership_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "ta@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    # TA can enroll students
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201
    student_membership_id = r.json()["id"]

    # TA cannot enroll staff
    r = await client.post(
        "/api/v1/users",
        json={"email": "another@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    another_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": another_id, "role": "ta"},
    )
    assert r.status_code == 403

    # TA can remove students
    r = await client.delete(
        f"/api/v1/staff/courses/{course_id}/memberships/{student_membership_id}"
    )
    assert r.status_code == 204

    # TA cannot remove staff
    r = await client.delete(
        f"/api/v1/staff/courses/{course_id}/memberships/{ta_membership_id}"
    )
    assert r.status_code == 403

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    # Owner cannot be removed via DELETE; must transfer ownership first.
    r = await client.get(f"/api/v1/staff/courses/{course_id}/memberships")
    assert r.status_code == 200
    owner_membership_id = next(m["id"] for m in r.json() if m["role"] == "owner")

    r = await client.delete(
        f"/api/v1/staff/courses/{course_id}/memberships/{owner_membership_id}"
    )
    assert r.status_code == 400

    # Owner cannot be created directly via enroll endpoint.
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "owner"},
    )
    assert r.status_code == 400

