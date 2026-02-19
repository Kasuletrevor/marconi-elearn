import httpx
import pytest

from app.integrations.jobe import JobeClient, JobeTransientError, JobeUpstreamError


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
