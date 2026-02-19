import httpx
import pytest

from app.core.config import settings
from app.integrations.jobe import (
    JobeCircuitOpenError,
    JobeClient,
    JobeTransientError,
    JobeUpstreamError,
    parse_jobe_base_urls,
)


@pytest.fixture(autouse=True)
def reset_jobe_circuit_state():
    JobeClient.reset_circuit_breaker_state_for_tests()
    yield
    JobeClient.reset_circuit_breaker_state_for_tests()


@pytest.fixture
def override_circuit_breaker_settings():
    original_enabled = settings.jobe_circuit_breaker_enabled
    original_threshold = settings.jobe_circuit_breaker_failure_threshold
    original_cooldown = settings.jobe_circuit_breaker_cooldown_seconds
    try:
        yield
    finally:
        settings.jobe_circuit_breaker_enabled = original_enabled
        settings.jobe_circuit_breaker_failure_threshold = original_threshold
        settings.jobe_circuit_breaker_cooldown_seconds = original_cooldown


@pytest.mark.asyncio
async def test_jobe_client_maps_timeouts(monkeypatch):
    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, path):
            raise httpx.ReadTimeout("timeout")

    monkeypatch.setattr("app.integrations.jobe.httpx.AsyncClient", lambda **kwargs: _FakeClient())

    jobe = JobeClient(base_url="http://example.com/restapi", timeout_seconds=1)
    with pytest.raises(JobeTransientError):
        await jobe.list_languages()


@pytest.mark.asyncio
async def test_jobe_client_maps_upstream_http_status(monkeypatch):
    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, path, json):
            request = httpx.Request("POST", "http://example.com/restapi/runs")
            response = httpx.Response(502, request=request, text="bad gateway")
            raise httpx.HTTPStatusError("bad status", request=request, response=response)

    monkeypatch.setattr("app.integrations.jobe.httpx.AsyncClient", lambda **kwargs: _FakeClient())

    jobe = JobeClient(base_url="http://example.com/restapi", timeout_seconds=1)
    with pytest.raises(JobeUpstreamError):
        await jobe.run(language_id="c", source_code="int main(){}", stdin="")


@pytest.mark.asyncio
async def test_jobe_client_sends_api_key_header(monkeypatch):
    captured_headers: dict[str, str] = {}

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return [["c", "11.4.0"]]

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, path):
            return _FakeResponse()

    def _fake_async_client(**kwargs):
        nonlocal captured_headers
        captured_headers = kwargs.get("headers", {})
        return _FakeClient()

    monkeypatch.setattr("app.integrations.jobe.httpx.AsyncClient", _fake_async_client)

    jobe = JobeClient(
        base_url="http://example.com/restapi",
        timeout_seconds=1,
        api_key="test-key",
    )
    await jobe.list_languages()
    assert captured_headers == {"X-API-KEY": "test-key"}


@pytest.mark.asyncio
async def test_jobe_client_includes_resource_caps_in_run_parameters(monkeypatch):
    captured_payload: dict = {}

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return {
                "outcome": 15,
                "cmpinfo": "",
                "stdout": "ok\n",
                "stderr": "",
            }

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def post(self, path, json):
            nonlocal captured_payload
            captured_payload = json
            return _FakeResponse()

    monkeypatch.setattr("app.integrations.jobe.httpx.AsyncClient", lambda **kwargs: _FakeClient())

    jobe = JobeClient(base_url="http://example.com/restapi", timeout_seconds=1)
    await jobe.run(
        language_id="c",
        source_code="int main(){return 0;}",
        stdin="",
        parameters={"compileargs": "-Wall"},
        cputime=10,
        memorylimit=256,
        streamsize=0.064,
    )

    run_parameters = captured_payload["run_spec"]["parameters"]
    assert run_parameters["compileargs"] == "-Wall"
    assert run_parameters["cputime"] == 10
    assert run_parameters["memorylimit"] == 256
    assert run_parameters["streamsize"] == 0.064


@pytest.mark.asyncio
async def test_jobe_circuit_breaker_opens_after_consecutive_failures(
    monkeypatch,
    override_circuit_breaker_settings,
):
    settings.jobe_circuit_breaker_enabled = True
    settings.jobe_circuit_breaker_failure_threshold = 2
    settings.jobe_circuit_breaker_cooldown_seconds = 60

    calls = {"count": 0}

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, path):
            calls["count"] += 1
            raise httpx.ReadTimeout("timeout")

    monkeypatch.setattr("app.integrations.jobe.httpx.AsyncClient", lambda **kwargs: _FakeClient())

    jobe = JobeClient(base_url="http://example.com/restapi", timeout_seconds=1)
    with pytest.raises(JobeTransientError):
        await jobe.list_languages()
    with pytest.raises(JobeTransientError):
        await jobe.list_languages()
    with pytest.raises(JobeCircuitOpenError):
        await jobe.list_languages()

    assert calls["count"] == 2


@pytest.mark.asyncio
async def test_jobe_circuit_breaker_half_open_probe_closes_on_success(
    monkeypatch,
    override_circuit_breaker_settings,
):
    settings.jobe_circuit_breaker_enabled = True
    settings.jobe_circuit_breaker_failure_threshold = 1
    settings.jobe_circuit_breaker_cooldown_seconds = 1

    class _FakeResponse:
        def __init__(self, payload):
            self._payload = payload

        def raise_for_status(self):
            return None

        def json(self):
            return self._payload

    calls = {"count": 0}

    class _FakeClient:
        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, path):
            calls["count"] += 1
            if calls["count"] == 1:
                raise httpx.ReadTimeout("timeout")
            return _FakeResponse([["c", "11.4.0"]])

    monkeypatch.setattr("app.integrations.jobe.httpx.AsyncClient", lambda **kwargs: _FakeClient())
    monotonic_values = iter([0.0, 0.0, 2.0])
    monkeypatch.setattr(
        "app.integrations.jobe.time.monotonic",
        lambda: next(monotonic_values, 2.0),
    )

    jobe = JobeClient(base_url="http://example.com/restapi", timeout_seconds=1)
    with pytest.raises(JobeTransientError):
        await jobe.list_languages()
    recovered = await jobe.list_languages()
    assert recovered[0].id == "c"
    recovered_again = await jobe.list_languages()
    assert recovered_again[0].id == "c"

    assert calls["count"] == 3


def test_parse_jobe_base_urls_uses_list_and_fallback() -> None:
    urls = parse_jobe_base_urls(
        base_url="http://fallback/restapi",
        base_urls="http://a/restapi, http://b/restapi, http://a/restapi",
    )
    assert urls == [
        "http://a/restapi",
        "http://b/restapi",
        "http://fallback/restapi",
    ]


@pytest.mark.asyncio
async def test_jobe_client_round_robins_across_backends(monkeypatch):
    called_base_urls: list[str] = []

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return [["c", "11.4.0"]]

    class _FakeClient:
        def __init__(self, base_url: str):
            self._base_url = base_url

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, path):
            called_base_urls.append(self._base_url)
            return _FakeResponse()

    monkeypatch.setattr(
        "app.integrations.jobe.httpx.AsyncClient",
        lambda **kwargs: _FakeClient(kwargs["base_url"]),
    )

    jobe = JobeClient(
        base_urls=["http://jobe-a/restapi", "http://jobe-b/restapi"],
        timeout_seconds=1,
    )
    await jobe.list_languages()
    await jobe.list_languages()
    await jobe.list_languages()

    assert called_base_urls == [
        "http://jobe-a/restapi",
        "http://jobe-b/restapi",
        "http://jobe-a/restapi",
    ]


@pytest.mark.asyncio
async def test_jobe_client_fails_over_to_next_backend(monkeypatch):
    called_base_urls: list[str] = []

    class _FakeResponse:
        def raise_for_status(self):
            return None

        def json(self):
            return [["c", "11.4.0"]]

    class _FakeClient:
        def __init__(self, base_url: str):
            self._base_url = base_url

        async def __aenter__(self):
            return self

        async def __aexit__(self, exc_type, exc, tb):
            return False

        async def get(self, path):
            called_base_urls.append(self._base_url)
            if self._base_url.endswith("jobe-a/restapi"):
                raise httpx.ReadTimeout("timeout")
            return _FakeResponse()

    monkeypatch.setattr(
        "app.integrations.jobe.httpx.AsyncClient",
        lambda **kwargs: _FakeClient(kwargs["base_url"]),
    )

    jobe = JobeClient(
        base_urls=["http://jobe-a/restapi", "http://jobe-b/restapi"],
        timeout_seconds=1,
    )
    result = await jobe.list_languages()

    assert result[0].id == "c"
    assert called_base_urls == [
        "http://jobe-a/restapi",
        "http://jobe-b/restapi",
    ]
