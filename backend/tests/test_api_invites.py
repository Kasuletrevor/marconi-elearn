from io import BytesIO

import pytest
from sqlalchemy import select


async def _login_admin(client) -> None:
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_csv_import_creates_invites_and_accept_enrolls_student(client, db):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS101", "title": "Intro", "description": None})
    course_id = r.json()["id"]

    csv_bytes = BytesIO(
        b"email,name,student_number,programme\n"
        b"stud@example.com,Student One,ST001,BCS\n"
        b"invalid-email,No Name,ST002,BCS\n"
    )
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/invites/import-csv",
        files={"file": ("roster.csv", csv_bytes, "text/csv")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["created_invites"] == 1
    assert body["auto_enrolled"] == 0
    assert len(body["invite_links"]) == 1
    assert len(body["issues"]) == 1

    token = body["invite_links"][0].split("/invite/")[1]

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/invite/accept", json={"token": token, "password": "password123"})
    assert r.status_code == 200
    assert r.json()["email"] == "stud@example.com"

    from app.models.course_membership import CourseMembership
    from app.models.student_profile import StudentProfile

    result = await db.execute(select(StudentProfile).where(StudentProfile.user_id == r.json()["id"]))
    profile = result.scalars().first()
    assert profile is not None
    assert profile.full_name == "Student One"
    assert profile.programme == "BCS"

    result = await db.execute(select(CourseMembership).where(CourseMembership.course_id == course_id))
    memberships = list(result.scalars().all())
    assert any(m.student_number == "ST001" for m in memberships)

    r = await client.get("/api/v1/student/courses")
    assert r.status_code == 200
    assert len(r.json()) == 1
    assert r.json()[0]["id"] == course_id


@pytest.mark.asyncio
async def test_csv_import_auto_enrolls_activated_user(client):
    await _login_admin(client)
    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": None},
    )
    course_id = r.json()["id"]

    # Pre-create an activated user (has password), so import should auto-enroll with no invite.
    r = await client.post("/api/v1/users", json={"email": "active@example.com", "password": "password123"})
    assert r.status_code == 201

    csv_bytes = BytesIO(
        b"email,name,student_number,programme\n"
        b"active@example.com,Active Student,ST100,BCS\n"
    )
    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/invites/import-csv",
        files={"file": ("roster.csv", csv_bytes, "text/csv")},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["created_invites"] == 0
    assert body["auto_enrolled"] == 1
    assert body["invite_links"] == []
