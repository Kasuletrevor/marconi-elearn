from datetime import datetime, timedelta, timezone

import pytest
from sqlalchemy import select

from app.models.course_membership import CourseMembership
from app.models.org_github_admin_token import OrgGitHubAdminToken


async def _login_admin(client):
    r = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert r.status_code == 200


@pytest.mark.asyncio
async def test_staff_can_list_github_classrooms_filtered_by_org(client, db, monkeypatch):
    await _login_admin(client)

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.patch(
        f"/api/v1/orgs/{org_id}",
        json={"github_org_login": "marconi-org"},
    )
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro"},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    token = OrgGitHubAdminToken(
        organization_id=org_id,
        user_id=1,
        github_user_id=123,
        github_login="org-admin",
        access_token_enc="enc",
        refresh_token_enc="enc",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        refresh_token_expires_at=None,
        last_verified_at=datetime.now(timezone.utc),
        revoked_at=None,
    )
    db.add(token)
    await db.commit()

    monkeypatch.setattr("app.api.routes.staff_course_github_sync.decrypt_token", lambda _v: "token")
    async def _fake_list_classrooms(*, access_token):
        _ = access_token
        return [
            {"id": 11, "name": "Class A", "organization": {"login": "marconi-org"}, "archived_at": None},
            {"id": 12, "name": "Class B", "organization": {"login": "other-org"}, "archived_at": None},
        ]

    monkeypatch.setattr("app.api.routes.staff_course_github_sync.list_classrooms", _fake_list_classrooms)

    r = await client.get(f"/api/v1/staff/courses/{course_id}/github/classrooms")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 1
    assert data[0]["id"] == 11
    assert data[0]["name"] == "Class A"


@pytest.mark.asyncio
async def test_staff_github_roster_sync_compares_linked_and_accepted(client, db, monkeypatch):
    await _login_admin(client)

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.patch(
        f"/api/v1/orgs/{org_id}",
        json={"github_org_login": "marconi-org"},
    )
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro"},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        "/api/v1/users",
        json={"email": "student@example.com", "password": "password123"},
    )
    assert r.status_code == 201
    student_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201
    membership_id = r.json()["id"]

    membership_res = await db.execute(
        select(CourseMembership).where(CourseMembership.id == membership_id)
    )
    membership = membership_res.scalars().one()
    membership.github_login = "StudentOne"
    membership.github_user_id = 777
    await db.commit()

    token = OrgGitHubAdminToken(
        organization_id=org_id,
        user_id=1,
        github_user_id=123,
        github_login="org-admin",
        access_token_enc="enc",
        refresh_token_enc="enc",
        token_expires_at=datetime.now(timezone.utc) + timedelta(hours=2),
        refresh_token_expires_at=None,
        last_verified_at=datetime.now(timezone.utc),
        revoked_at=None,
    )
    db.add(token)
    await db.commit()

    monkeypatch.setattr("app.api.routes.staff_course_github_sync.decrypt_token", lambda _v: "token")
    async def _fake_list_classrooms(*, access_token):
        _ = access_token
        return [
            {"id": 11, "name": "Class A", "organization": {"login": "marconi-org"}, "archived_at": None},
        ]

    async def _fake_list_assignments(*, access_token, classroom_id):
        _ = (access_token, classroom_id)
        return [
            {
                "id": 201,
                "title": "Assignment A",
                "invite_link": "https://classroom.github.com/a/example",
                "deadline": "2026-02-28T00:00:00Z",
            },
        ]

    async def _fake_list_accepted(*, access_token, assignment_id):
        _ = (access_token, assignment_id)
        return [
            {"students": [{"login": "studentone"}]},
            {"students": [{"login": "extra-student"}]},
        ]

    monkeypatch.setattr("app.api.routes.staff_course_github_sync.list_classrooms", _fake_list_classrooms)
    monkeypatch.setattr(
        "app.api.routes.staff_course_github_sync.list_classroom_assignments",
        _fake_list_assignments,
    )
    monkeypatch.setattr(
        "app.api.routes.staff_course_github_sync.list_accepted_assignments",
        _fake_list_accepted,
    )

    r = await client.get(
        f"/api/v1/staff/courses/{course_id}/github/roster-sync?classroom_id=11&assignment_id=201"
    )
    assert r.status_code == 200
    payload = r.json()
    assert payload["linked_students_total"] == 1
    assert payload["accepted_students_total"] == 2
    assert payload["matched_logins"] == ["studentone"]
    assert payload["missing_logins"] == []
    assert payload["extra_logins"] == ["extra-student"]
    assert payload["assignments"][0]["invite_link"] == "https://classroom.github.com/a/example"
