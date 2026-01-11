import pytest


@pytest.mark.asyncio
async def test_staff_can_update_membership_roles_with_owner_transfer(client):
    # Admin sets up org + course (admin is org admin + course owner)
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "Intro"})
    assert r.status_code == 201
    course_id = r.json()["id"]

    # Create lecturer + TA users
    r = await client.post("/api/v1/users", json={"email": "lec@example.com", "password": "password123"})
    assert r.status_code == 201
    lec_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "ta@example.com", "password": "password123"})
    assert r.status_code == 201
    ta_id = r.json()["id"]

    # Enroll lecturer + TA in course via staff endpoint
    r = await client.post(f"/api/v1/staff/courses/{course_id}/memberships", json={"user_id": lec_id, "role": "co_lecturer"})
    assert r.status_code == 201
    lec_membership_id = r.json()["id"]

    r = await client.post(f"/api/v1/staff/courses/{course_id}/memberships", json={"user_id": ta_id, "role": "ta"})
    assert r.status_code == 201
    ta_membership_id = r.json()["id"]

    # TA cannot update roles
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "ta@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}/memberships/{ta_membership_id}",
        json={"role": "co_lecturer"},
    )
    assert r.status_code == 403

    # Owner can transfer ownership to lecturer, and owner is demoted to co_lecturer
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}/memberships/{lec_membership_id}",
        json={"role": "owner"},
    )
    assert r.status_code == 200
    assert r.json()["role"] == "owner"

    r = await client.get(f"/api/v1/staff/courses/{course_id}/memberships")
    assert r.status_code == 200
    roles = {m["user_id"]: m["role"] for m in r.json()}
    assert roles[lec_id] == "owner"
    assert roles[ta_id] == "ta"
