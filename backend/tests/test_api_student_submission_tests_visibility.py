from io import BytesIO

import pytest

from app.models.submission_test_result import SubmissionTestResult


@pytest.mark.asyncio
async def test_student_submission_tests_only_show_non_hidden(client, db):
    # Admin creates org/course/assignment and enrolls a student
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
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
        json={
            "name": "Visible 1",
            "position": 1,
            "points": 5,
            "is_hidden": False,
            "stdin": "2\n",
            "expected_stdout": "2\n",
            "expected_stderr": "",
        },
    )
    assert r.status_code == 201
    visible_test_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
        json={
            "name": "Hidden 1",
            "position": 2,
            "points": 5,
            "is_hidden": True,
            "stdin": "3\n",
            "expected_stdout": "3\n",
            "expected_stderr": "",
        },
    )
    assert r.status_code == 201
    hidden_test_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 201
    stud_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": stud_id, "role": "student"},
    )
    assert r.status_code == 201

    # Student submits
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-cc")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    # Insert test results directly (worker isn't running during tests)
    db.add(
        SubmissionTestResult(
            submission_id=submission_id,
            test_case_id=visible_test_id,
            passed=True,
            outcome=0,
            compile_output="",
            stdout="2\n",
            stderr="",
        )
    )
    db.add(
        SubmissionTestResult(
            submission_id=submission_id,
            test_case_id=hidden_test_id,
            passed=False,
            outcome=1,
            compile_output="gcc: error: nope",
            stdout="",
            stderr="",
        )
    )
    await db.commit()

    r = await client.get(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions/{submission_id}/tests"
    )
    assert r.status_code == 200
    payload = r.json()
    assert payload["submission_id"] == submission_id
    assert payload["compile_output"] == "gcc: error: nope"
    assert [t["test_case_id"] for t in payload["tests"]] == [visible_test_id]
    assert payload["tests"][0]["name"] == "Visible 1"
    assert payload["tests"][0]["expected_stdout"] == "2\n"
    assert payload["tests"][0]["stdout"] == "2\n"


@pytest.mark.asyncio
async def test_student_submission_tests_reject_other_students(client, db):
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
        f"/api/v1/orgs/{org_id}/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Do X", "module_id": None, "max_points": 10},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post("/api/v1/users", json={"email": "stud1@example.com", "password": "password123"})
    assert r.status_code == 201
    stud1_id = r.json()["id"]
    r = await client.post("/api/v1/users", json={"email": "stud2@example.com", "password": "password123"})
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

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud1@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-cc")},
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "stud2@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.get(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions/{submission_id}/tests"
    )
    assert r.status_code == 404

