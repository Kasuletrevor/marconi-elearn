import pytest

from app.api.deps.jobe import get_jobe_client
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

