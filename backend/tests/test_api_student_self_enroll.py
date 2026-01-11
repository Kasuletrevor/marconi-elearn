import pytest


@pytest.mark.asyncio
async def test_student_can_join_course_by_self_enroll_code(client):
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

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}",
        json={"self_enroll_enabled": True},
    )
    assert r.status_code == 200
    enroll_code = r.json()["self_enroll_code"]
    assert isinstance(enroll_code, str) and enroll_code

    # Student joins by code
    r = await client.post(
        "/api/v1/users",
        json={"email": "student@example.com", "password": "password123"},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "student@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.post(
        "/api/v1/student/courses/join",
        json={
            "code": enroll_code,
            "full_name": "Student One",
            "student_number": "S-001",
            "programme": "CS",
        },
    )
    assert r.status_code == 201
    assert r.json()["id"] == course_id

    # Joining twice is rejected
    r = await client.post(
        "/api/v1/student/courses/join",
        json={
            "code": enroll_code,
            "full_name": "Student One",
            "student_number": "S-001",
            "programme": "CS",
        },
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_self_enroll_rejects_invalid_code(client):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.post(
        "/api/v1/student/courses/join",
        json={
            "code": "NOTREAL",
            "full_name": "Student One",
            "student_number": "S-001",
            "programme": "CS",
        },
    )
    assert r.status_code == 404


@pytest.mark.asyncio
async def test_self_enroll_enforces_unique_student_number_per_course(client):
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

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}",
        json={"self_enroll_enabled": True},
    )
    assert r.status_code == 200
    enroll_code = r.json()["self_enroll_code"]

    # First student
    r = await client.post(
        "/api/v1/users",
        json={"email": "student1@example.com", "password": "password123"},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "student1@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.post(
        "/api/v1/student/courses/join",
        json={
            "code": enroll_code,
            "full_name": "Student One",
            "student_number": "S-001",
            "programme": "CS",
        },
    )
    assert r.status_code == 201

    # Second student tries to reuse student number
    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200
    r = await client.post(
        "/api/v1/users",
        json={"email": "student2@example.com", "password": "password123"},
    )
    assert r.status_code == 201

    await client.post("/api/v1/auth/logout")
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "student2@example.com", "password": "password123"},
    )
    assert r.status_code == 200

    r = await client.post(
        "/api/v1/student/courses/join",
        json={
            "code": enroll_code,
            "full_name": "Student Two",
            "student_number": "S-001",
            "programme": "CS",
        },
    )
    assert r.status_code == 409

