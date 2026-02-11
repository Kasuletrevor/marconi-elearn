from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import httpx

JOBE_OUTCOME_OK = 15


class JobeError(RuntimeError):
    pass


class JobeMisconfiguredError(JobeError):
    pass


class JobeTransientError(JobeError):
    pass


class JobeUpstreamError(JobeError):
    pass


@dataclass(frozen=True, slots=True)
class JobeLanguage:
    id: str
    version: str


@dataclass(frozen=True, slots=True)
class JobeRunResult:
    outcome: int
    compile_output: str
    stdout: str
    stderr: str


class JobeClient:
    def __init__(self, *, base_url: str, timeout_seconds: float, api_key: str = "") -> None:
        base_url = base_url.strip().rstrip("/")
        if not base_url:
            raise JobeMisconfiguredError("JOBE base URL is not configured")
        self._base_url = base_url
        self._timeout = httpx.Timeout(timeout_seconds)
        self._api_key = api_key.strip()

    def _client_kwargs(self) -> dict[str, Any]:
        kwargs: dict[str, Any] = {"base_url": self._base_url, "timeout": self._timeout}
        if self._api_key:
            kwargs["headers"] = {"X-API-KEY": self._api_key}
        return kwargs

    async def list_languages(self) -> list[JobeLanguage]:
        try:
            async with httpx.AsyncClient(**self._client_kwargs()) as client:
                resp = await client.get("/languages")
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            raise JobeTransientError("JOBE request timed out") from exc
        except httpx.TransportError as exc:
            raise JobeTransientError("JOBE connection error") from exc
        except httpx.HTTPStatusError as exc:
            raise JobeUpstreamError("JOBE returned an error response") from exc

        if not isinstance(data, list):
            raise JobeError("Unexpected JOBE response for /languages")

        languages: list[JobeLanguage] = []
        for item in data:
            if (
                isinstance(item, list)
                and len(item) == 2
                and isinstance(item[0], str)
                and isinstance(item[1], str)
            ):
                languages.append(JobeLanguage(id=item[0], version=item[1]))
        return languages

    async def run(
        self,
        *,
        language_id: str,
        source_code: str,
        stdin: str,
        source_filename: str | None = None,
        file_list: list[tuple[str, str]] | None = None,
        parameters: dict[str, Any] | None = None,
    ) -> JobeRunResult:
        run_spec: dict[str, Any] = {
            "language_id": language_id,
            "sourcecode": source_code,
            "input": stdin,
        }
        if source_filename:
            run_spec["sourcefilename"] = source_filename
        if file_list:
            run_spec["file_list"] = [[file_id, file_name] for file_id, file_name in file_list]
        if parameters:
            run_spec["parameters"] = parameters

        payload: dict[str, Any] = {"run_spec": run_spec}

        try:
            async with httpx.AsyncClient(**self._client_kwargs()) as client:
                resp = await client.post("/runs", json=payload)
                resp.raise_for_status()
                data = resp.json()
        except httpx.TimeoutException as exc:
            raise JobeTransientError("JOBE request timed out") from exc
        except httpx.TransportError as exc:
            raise JobeTransientError("JOBE connection error") from exc
        except httpx.HTTPStatusError as exc:
            raise JobeUpstreamError("JOBE returned an error response") from exc

        if not isinstance(data, dict):
            raise JobeError("Unexpected JOBE response for /runs")

        outcome = data.get("outcome")
        if not isinstance(outcome, int):
            raise JobeError("Unexpected JOBE response: missing outcome")

        compile_output = data.get("cmpinfo")
        stdout = data.get("stdout")
        stderr = data.get("stderr")
        if not isinstance(compile_output, str) or not isinstance(stdout, str) or not isinstance(stderr, str):
            raise JobeError("Unexpected JOBE response: missing output fields")

        return JobeRunResult(
            outcome=outcome,
            compile_output=compile_output,
            stdout=stdout,
            stderr=stderr,
        )

    async def check_file(self, *, file_id: str) -> bool:
        try:
            async with httpx.AsyncClient(**self._client_kwargs()) as client:
                resp = await client.head(f"/files/{file_id}")
        except httpx.TimeoutException as exc:
            raise JobeTransientError("JOBE request timed out") from exc
        except httpx.TransportError as exc:
            raise JobeTransientError("JOBE connection error") from exc

        if resp.status_code == 204:
            return True
        if resp.status_code == 404:
            return False
        raise JobeUpstreamError("JOBE returned an error response")  # pragma: no cover

    async def put_file(self, *, file_id: str, content: bytes) -> None:
        try:
            async with httpx.AsyncClient(**self._client_kwargs()) as client:
                resp = await client.put(f"/files/{file_id}", content=content)
        except httpx.TimeoutException as exc:
            raise JobeTransientError("JOBE request timed out") from exc
        except httpx.TransportError as exc:
            raise JobeTransientError("JOBE connection error") from exc

        if resp.status_code == 204:
            return
        if resp.status_code == 403:
            return
        raise JobeUpstreamError("JOBE returned an error response")  # pragma: no cover

    async def ensure_file(self, *, file_id: str, content: bytes) -> None:
        if await self.check_file(file_id=file_id):
            return
        await self.put_file(file_id=file_id, content=content)
