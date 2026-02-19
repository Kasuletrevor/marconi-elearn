from __future__ import annotations

from contextlib import asynccontextmanager
from io import BytesIO

import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import async_sessionmaker

from app.integrations.jobe import JOBE_OUTCOME_OK
from app.core.config import settings
from app.models.submission import Submission, SubmissionStatus
from app.worker.grading import PreparedJobeRun, RunCheck
from app.worker.tasks import _grade_submission_impl


async def _login(client, *, email: str, password: str) -> None:
    response = await client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert response.status_code == 200


async def _setup_submission(client) -> int:
    await _login(client, email="admin@example.com", password="password123")

    response = await client.post("/api/v1/orgs", json={"name": "Org Queue"})
    assert response.status_code == 201
    org_id = response.json()["id"]

    response = await client.post(
        f"/api/v1/orgs/{org_id}/courses",
        json={"code": "CS400", "title": "Queue Systems"},
    )
    assert response.status_code == 201
    course_id = response.json()["id"]

    response = await client.post("/api/v1/users", json={"email": "queue.student@example.com", "password": "password123"})
    assert response.status_code == 201
    student_id = response.json()["id"]

    response = await client.post(
        f"/api/v1/orgs/{org_id}/courses/{course_id}/memberships",
        json={"user_id": student_id, "role": "student"},
    )
    assert response.status_code == 201

    response = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments",
        json={"title": "A1", "description": "Desc", "module_id": None, "autograde_mode": "practice_only"},
    )
    assert response.status_code == 201
    assignment_id = response.json()["id"]

    response = await client.post(
        f"/api/v1/staff/courses/{course_id}/assignments/{assignment_id}/testcases",
        json={
            "name": "T1",
            "position": 1,
            "points": 7,
            "is_hidden": False,
            "stdin": "",
            "expected_stdout": "ok\n",
            "expected_stderr": "",
        },
    )
    assert response.status_code == 201

    await client.post("/api/v1/auth/logout")
    await _login(client, email="queue.student@example.com", password="password123")

    response = await client.post(
        f"/api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions",
        files={"file": ("main.c", BytesIO(b"int main(){return 0;}\n"), "text/x-c")},
    )
    assert response.status_code == 201
    return int(response.json()["id"])


def _prepared_run() -> PreparedJobeRun:
    return PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}\n",
        source_filename="main.c",
        file_list=None,
        parameters=None,
        cputime=settings.jobe_grading_cputime_seconds,
        memorylimit=settings.jobe_grading_memorylimit_mb,
        streamsize=settings.jobe_grading_streamsize_mb,
    )


async def _session_factory_for_schema(db):
    schema = (await db.execute(text("SELECT current_schema()"))).scalar_one()
    session_maker = async_sessionmaker(db.bind, expire_on_commit=False)

    @asynccontextmanager
    async def _factory():
        async with session_maker() as session:
            await session.execute(text(f"SET search_path TO {schema}"))
            yield session

    return _factory


@pytest.mark.asyncio
async def test_grade_submission_transitions_pending_to_graded(client, db, monkeypatch) -> None:
    submission_id = await _setup_submission(client)
    session_factory = await _session_factory_for_schema(db)

    submission = (await db.execute(select(Submission).where(Submission.id == submission_id))).scalar_one()
    assert submission.status == SubmissionStatus.pending

    async def _fake_prepare(*args, **kwargs):
        return _prepared_run()

    async def _fake_run_test_case(*args, **kwargs):
        return RunCheck(
            passed=True,
            outcome=JOBE_OUTCOME_OK,
            compile_output="",
            stdout="ok\n",
            stderr="",
        )

    monkeypatch.setattr("app.worker.tasks._jobe_client", lambda: object())
    monkeypatch.setattr("app.worker.tasks.prepare_jobe_run", _fake_prepare)
    monkeypatch.setattr("app.worker.tasks.run_test_case", _fake_run_test_case)

    result = await _grade_submission_impl(
        submission_id=submission_id,
        phase="practice",
        attempt=0,
        session_factory=session_factory,
    )
    assert result["status"] == "graded"

    await db.refresh(submission)
    assert submission.status == SubmissionStatus.graded
    assert submission.score == 7
    assert submission.feedback is not None
    assert submission.feedback.startswith("Practice: Passed 7/7 points across 1 tests.")


@pytest.mark.asyncio
async def test_grade_submission_transitions_pending_to_error(client, db, monkeypatch) -> None:
    submission_id = await _setup_submission(client)
    session_factory = await _session_factory_for_schema(db)

    submission = (await db.execute(select(Submission).where(Submission.id == submission_id))).scalar_one()
    assert submission.status == SubmissionStatus.pending

    async def _fake_prepare(*args, **kwargs):
        return _prepared_run()

    async def _fake_run_test_case(*args, **kwargs):
        return RunCheck(
            passed=False,
            outcome=11,
            compile_output="gcc: error: broken source",
            stdout="",
            stderr="",
        )

    monkeypatch.setattr("app.worker.tasks._jobe_client", lambda: object())
    monkeypatch.setattr("app.worker.tasks.prepare_jobe_run", _fake_prepare)
    monkeypatch.setattr("app.worker.tasks.run_test_case", _fake_run_test_case)

    result = await _grade_submission_impl(
        submission_id=submission_id,
        phase="practice",
        attempt=0,
        session_factory=session_factory,
    )
    assert result["status"] == "error"

    await db.refresh(submission)
    assert submission.status == SubmissionStatus.error
    assert submission.score == 0
    assert submission.feedback == "gcc: error: broken source"


@pytest.mark.asyncio
async def test_grade_submission_skips_non_pending_items(client, db) -> None:
    submission_id = await _setup_submission(client)
    session_factory = await _session_factory_for_schema(db)

    submission = (await db.execute(select(Submission).where(Submission.id == submission_id))).scalar_one()
    submission.status = SubmissionStatus.grading
    await db.commit()

    result = await _grade_submission_impl(
        submission_id=submission_id,
        phase="practice",
        attempt=0,
        session_factory=session_factory,
    )
    assert result["status"] == "skipped"

    await db.refresh(submission)
    assert submission.status == SubmissionStatus.grading
