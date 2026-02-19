import asyncio
import pytest

from app.api.deps.jobe import get_jobe_client
from app.api.routes import playground as playground_route
from app.core.config import settings
from app.main import app


class _FakeJobeClient:
    async def list_languages(self):
        return [
            type("Lang", (), {"id": "c", "version": "13.3.0"})(),
            type("Lang", (), {"id": "cpp", "version": "13.3.0"})(),
            type("Lang", (), {"id": "python3", "version": "3.12.3"})(),
        ]

    async def run(self, *, language_id: str, source_code: str, stdin: str):
        assert language_id
        assert source_code
        return type(
            "Run",
            (),
            {
                "outcome": 15,
                "compile_output": "",
                "stdout": "ok\n",
                "stderr": "",
            },
        )()


@pytest.fixture(autouse=True)
def _restore_playground_capacity_settings():
    original_limit = settings.playground_max_concurrent_runs
    original_wait = settings.playground_queue_wait_seconds
    playground_route._reset_playground_run_semaphore_for_tests()
    try:
        yield
    finally:
        settings.playground_max_concurrent_runs = original_limit
        settings.playground_queue_wait_seconds = original_wait
        playground_route._reset_playground_run_semaphore_for_tests()


class _SlowFakeJobeClient(_FakeJobeClient):
    async def run(self, *, language_id: str, source_code: str, stdin: str):
        await asyncio.sleep(0.2)
        return await super().run(language_id=language_id, source_code=source_code, stdin=stdin)


@pytest.mark.asyncio
async def test_playground_requires_auth(client):
    r = await client.get("/api/v1/playground/languages")
    assert r.status_code == 401


@pytest.mark.asyncio
async def test_playground_languages_filtered_by_allowlist(client):
    app.dependency_overrides[get_jobe_client] = lambda: _FakeJobeClient()
    try:
        r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
        assert r.status_code == 200

        r = await client.get("/api/v1/playground/languages")
        assert r.status_code == 200
        ids = {x["id"] for x in r.json()}
        assert ids == {"c", "cpp"}
    finally:
        app.dependency_overrides.pop(get_jobe_client, None)


@pytest.mark.asyncio
async def test_playground_run_rejects_disallowed_language(client):
    app.dependency_overrides[get_jobe_client] = lambda: _FakeJobeClient()
    try:
        r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
        assert r.status_code == 200

        r = await client.post(
            "/api/v1/playground/run",
            json={"language_id": "python3", "source_code": "print('hi')", "stdin": ""},
        )
        assert r.status_code == 400
    finally:
        app.dependency_overrides.pop(get_jobe_client, None)


@pytest.mark.asyncio
async def test_playground_run_ok(client):
    app.dependency_overrides[get_jobe_client] = lambda: _FakeJobeClient()
    try:
        r = await client.post("/api/v1/auth/login", json={"email": "admin@example.com", "password": "password123"})
        assert r.status_code == 200

        r = await client.post(
            "/api/v1/playground/run",
            json={"language_id": "c", "source_code": "int main(){return 0;}", "stdin": ""},
        )
        assert r.status_code == 200
        assert r.json()["stdout"] == "ok\n"
    finally:
        app.dependency_overrides.pop(get_jobe_client, None)


@pytest.mark.asyncio
async def test_playground_run_returns_429_when_capacity_exhausted(client):
    app.dependency_overrides[get_jobe_client] = lambda: _SlowFakeJobeClient()
    settings.playground_max_concurrent_runs = 1
    settings.playground_queue_wait_seconds = 0.01
    playground_route._reset_playground_run_semaphore_for_tests()
    try:
        login_response = await client.post(
            "/api/v1/auth/login",
            json={"email": "admin@example.com", "password": "password123"},
        )
        assert login_response.status_code == 200

        first = asyncio.create_task(
            client.post(
                "/api/v1/playground/run",
                json={"language_id": "c", "source_code": "int main(){return 0;}", "stdin": ""},
            )
        )
        await asyncio.sleep(0.02)
        second = await client.post(
            "/api/v1/playground/run",
            json={"language_id": "c", "source_code": "int main(){return 0;}", "stdin": ""},
        )
        first_result = await first

        assert first_result.status_code == 200
        assert second.status_code == 429
    finally:
        app.dependency_overrides.pop(get_jobe_client, None)
