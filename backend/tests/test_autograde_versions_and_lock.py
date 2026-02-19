from __future__ import annotations

from datetime import datetime, timezone

import pytest
from sqlalchemy import select

from app.models.assignment import Assignment
from app.models.assignment_autograde_test_case_snapshot import AssignmentAutogradeTestCaseSnapshot
from app.models.assignment_autograde_version import AssignmentAutogradeVersion
from app.models.submission import Submission
from app.models.submission_test_result import SubmissionTestResult


@pytest.mark.asyncio
async def test_autograde_versions_snapshot_and_lock(client, db):
    # Admin bootstraps org/course/assignment
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org Auto"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS300", "title": "Systems"})
    assert r.status_code == 201
    course_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Desc", "module_id": None, "autograde_mode": "hybrid"},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    # Assignment creation creates initial config version.
    assignment = (await db.execute(select(Assignment).where(Assignment.id == assignment_id))).scalar_one()
    old_active_version_id = assignment.active_autograde_version_id
    assert assignment.active_autograde_version_id is not None
    versions = (
        await db.execute(
            select(AssignmentAutogradeVersion).where(AssignmentAutogradeVersion.assignment_id == assignment_id)
        )
    ).scalars().all()
    assert len(versions) == 1

    # Creating a test case should create a new autograde version snapshot.
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
        json={
            "name": "Visible",
            "position": 1,
            "points": 5,
            "is_hidden": False,
            "stdin": "",
            "expected_stdout": "ok",
            "expected_stderr": "",
        },
    )
    assert r.status_code == 201
    test_case_id = r.json()["id"]

    await db.refresh(assignment)
    assert assignment.active_autograde_version_id != old_active_version_id

    versions2 = (
        await db.execute(
            select(AssignmentAutogradeVersion).where(AssignmentAutogradeVersion.assignment_id == assignment_id)
        )
    ).scalars().all()
    assert len(versions2) == 2

    snapshots = (
        await db.execute(
            select(AssignmentAutogradeTestCaseSnapshot).where(
                AssignmentAutogradeTestCaseSnapshot.autograde_version_id == assignment.active_autograde_version_id
            )
        )
    ).scalars().all()
    assert len(snapshots) == 1
    assert snapshots[0].test_case_id == test_case_id
    assert snapshots[0].is_hidden is False
    assert snapshots[0].comparison_mode == "trim"

    # Lock the assignment by setting final_autograde_enqueued_at; test case edits should be rejected.
    assignment.final_autograde_enqueued_at = datetime.now(timezone.utc)
    assignment.final_autograde_version_id = assignment.active_autograde_version_id
    await db.commit()

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
        json={
            "name": "Another",
            "position": 2,
            "points": 5,
            "is_hidden": False,
            "stdin": "",
            "expected_stdout": "ok2",
            "expected_stderr": "",
        },
    )
    assert r.status_code == 409

    r = await client.patch(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}",
        json={"autograde_mode": "practice_only"},
    )
    assert r.status_code == 409


@pytest.mark.asyncio
async def test_student_tests_prefers_final_phase(client, db):
    r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
    assert r.status_code == 200

    r = await client.post("/api/v1/orgs", json={"name": "Org Auto 2"})
    assert r.status_code == 201
    org_id = r.json()["id"]

    r = await client.post(f"/api/v1/orgs/{org_id}/courses", json={"code": "CS301", "title": "OS"})
    assert r.status_code == 201
    course_id = r.json()["id"]

    # Create student user and enroll.
    r = await client.post("/api/v1/users", json={"email": "s1@example.com", "password": "password123"})
    assert r.status_code == 201
    student_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert r.status_code == 201

    # Create assignment + one visible test case.
    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Desc", "module_id": None, "autograde_mode": "hybrid"},
    )
    assert r.status_code == 201
    assignment_id = r.json()["id"]

    r = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
        json={
            "name": "Visible",
            "position": 1,
            "points": 5,
            "is_hidden": False,
            "stdin": "",
            "expected_stdout": "ok",
            "expected_stderr": "",
        },
    )
    assert r.status_code == 201
    test_case_id = r.json()["id"]

    # Login as student and submit.
    await client.post("/api/v1/auth/logout")
    r = await client.post("/api/v1/auth/login", json={"email": "s1@example.com", "password": "password123"})
    assert r.status_code == 200

    files = {"file": ("main.c", b"int main(){return 0;}", "text/x-c")}
    r = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files=files,
    )
    assert r.status_code == 201
    submission_id = r.json()["id"]

    submission = (await db.execute(select(Submission).where(Submission.id == submission_id))).scalar_one()
    assignment = (await db.execute(select(Assignment).where(Assignment.id == assignment_id))).scalar_one()
    version_id = assignment.active_autograde_version_id
    assert version_id is not None

    # Seed both practice and final results with different stdout; endpoint should return final.
    submission.practice_autograde_version_id = version_id
    submission.final_autograde_version_id = version_id
    await db.flush()

    db.add(
        SubmissionTestResult(
            submission_id=submission_id,
            test_case_id=test_case_id,
            phase="practice",
            passed=True,
            outcome=0,
            compile_output="",
            stdout="practice-out",
            stderr="",
        )
    )
    db.add(
        SubmissionTestResult(
            submission_id=submission_id,
            test_case_id=test_case_id,
            phase="final",
            passed=True,
            outcome=0,
            compile_output="",
            stdout="final-out",
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
    assert payload["tests"][0]["stdout"] == "final-out"
