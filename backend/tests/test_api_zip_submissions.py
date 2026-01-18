from __future__ import annotations

from io import BytesIO
import zipfile

import pytest


async def _login(client, *, email: str, password: str) -> None:
    r = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert r.status_code == 200


def _zip_bytes(files: dict[str, bytes]) -> BytesIO:
    buf = BytesIO()
    with zipfile.ZipFile(buf, "w", compression=zipfile.ZIP_DEFLATED) as zf:
        for name, content in files.items():
            zf.writestr(name, content)
    buf.seek(0)
    return buf


@pytest.mark.asyncio
async def test_student_zip_submission_rejected_when_disabled(client):
    await _login(client, email="admin@example.com", password="password123")

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": None},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": None},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    await _login(client, email="stud@example.com", password="password123")

    zip_buf = _zip_bytes({"main.c": b"int main(){return 0;}\n"})
    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("submission.zip", zip_buf, "application/zip")},
    )
    assert r.status_code == 400
    assert "does not accept ZIP" in r.json()["detail"]


@pytest.mark.asyncio
async def test_staff_can_preview_zip_contents(client):
    await _login(client, email="admin@example.com", password="password123")

    r = await client.post("/api/v1/orgs", json={"name": "Org A"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS101", "title": "Intro", "description": None},
    )
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "ta@example.com", "password": "password123"})
    assert r.status_code == 201
    ta_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/memberships", json={"user_id": ta_id, "role": "ta"})
    assert r.status_code == 201
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": ta_id, "role": "ta"},
    )
    assert r.status_code == 201

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": None, "allows_zip": True, "expected_filename": "main.c"},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    await _login(client, email="stud@example.com", password="password123")

    zip_buf = _zip_bytes({"main.c": b"int main(){return 0;}\n", "utils.h": b"// header\n"})
    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("submission.zip", zip_buf, "application/zip")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    await _login(client, email="ta@example.com", password="password123")

    r = await client.get(f"/api/v1/staff/submissions/{submission_id}/zip-contents")
    assert r.status_code == 200
    payload = r.json()
    assert payload["file_count"] == 2
    assert {f["name"] for f in payload["files"]} == {"main.c", "utils.h"}
    assert payload["total_size"] > 0

