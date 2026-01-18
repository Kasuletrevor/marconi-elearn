import pytest


@pytest.mark.asyncio
async def test_staff_endpoints_allow_course_staff(client):
    # Admin sets up org + course
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "C Programming"})
    assert r.status_code == 201
    course_id = r.json()["id"]

    # Create TA user and enroll as TA (admin is org admin + course owner)
    r = await client.post("/api/v1/users", json={"email": "ta@example.com", "password": "password123"})
    assert r.status_code == 201
    ta_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/memberships",
        json={"user_id": ta_id, "role": "ta"},
    )
    assert r.status_code == 201

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": ta_id, "role": "ta"},
    )
    assert r.status_code == 201

    # Login as TA
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "ta@example.com", "password": "password123"})
    assert r.status_code == 200

    # Staff can see their courses
    r = await client.get("/api/v1/staff/courses")
    assert r.status_code == 200
    course_ids = [c["id"] for c in r.json()]
    assert course_id in course_ids

    # Course settings require instructor role (TA should be forbidden)
    r = await client.patch(f"/api/v1/staff/courses/{course_id}", json={"title": "New Title"})
    assert r.status_code == 403

    # Staff can manage modules
    r = await client.post(f"/api/v1/staff/courses/{course_id}/modules", json={"title": "Intro", "position": 1})
    assert r.status_code == 201
    module_id = r.json()["id"]

    r = await client.get(f"/api/v1/staff/courses/{course_id}/modules")
    assert r.status_code == 200
    assert any(m["id"] == module_id for m in r.json())

    # Staff can manage assignments
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments",
        json={"title": "Hello World", "description": "Write C", "module_id": module_id},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.get(f"/api/v1/staff/courses/{course_id}/assignments")
    assert r.status_code == 200
    assert any(a["id"] == assignment_id for a in r.json())

    # Staff can view roster
    r = await client.get(f"/api/v1/staff/courses/{course_id}/memberships")      
    assert r.status_code == 200
    assert any(m["user_id"] == ta_id and m["role"] == "ta" for m in r.json())   

    # Staff can list org members for dropdowns (without org-admin access)
    r = await client.get(f"/api/v1/orgs/{org_id}/memberships")
    assert r.status_code == 200

    r = await client.get(f"/api/v1/staff/courses/{course_id}/org-members")      
    assert r.status_code == 200
    assert any(m["user_id"] == ta_id for m in r.json())

    # Instructor can update course settings (admin is course owner)
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}",
        json={
            "semester": "Fall",
            "late_policy": {"enabled": True, "type": "percent_per_day", "grace_minutes": 30, "percent_per_day": 10, "max_percent": 100},
        },
    )
    assert r.status_code == 200
    assert r.json()["semester"] == "Fall"
    assert r.json()["late_policy"]["enabled"] is True

    # PATCH should allow clearing optional fields
    r = await client.patch(f"/api/v1/staff/courses/{course_id}", json={"semester": None, "late_policy": None})
    assert r.status_code == 200
    assert r.json()["semester"] is None
    assert r.json()["late_policy"] is None


@pytest.mark.asyncio
async def test_staff_endpoints_reject_students(client):
    # Admin sets up org + course and enrolls a student
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org B"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "OOP1", "title": "OOP"})
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    # Login as student
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    # Listing staff courses is allowed but should be empty
    r = await client.get("/api/v1/staff/courses")
    assert r.status_code == 200
    assert r.json() == []

    # Course management endpoints should be forbidden
    r = await client.get(f"/api/v1/staff/courses/{course_id}")
    assert r.status_code == 403
