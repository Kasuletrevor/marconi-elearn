from __future__ import annotations

from dataclasses import dataclass
import time
from threading import Lock
from typing import Any, Awaitable, Callable, Iterable, TypeVar

import httpx

from app.core.config import settings

JOBE_OUTCOME_OK = 15
T = TypeVar("T")


def _normalize_base_url(base_url: str) -> str:
    return base_url.strip().rstrip("/")


def _unique_preserving_order(items: Iterable[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def parse_jobe_base_urls(*, base_url: str, base_urls: str) -> list[str]:
    raw: list[str] = []
    if base_urls.strip():
        raw.extend(part for part in base_urls.split(","))
    if base_url.strip():
        raw.append(base_url)
    return _unique_preserving_order(
        normalized for normalized in (_normalize_base_url(item) for item in raw) if normalized
    )


class JobeError(RuntimeError):
    pass


class JobeMisconfiguredError(JobeError):
    pass


class JobeTransientError(JobeError):
    pass


class JobeCircuitOpenError(JobeTransientError):
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


@dataclass(slots=True)
class _CircuitState:
    state: str = "closed"  # closed | open | half_open
    consecutive_failures: int = 0
    opened_at_monotonic: float = 0.0
    half_open_probe_active: bool = False


class JobeClient:
    _circuit_lock = Lock()
    _circuit_states: dict[str, _CircuitState] = {}
    _selection_lock = Lock()
    _next_start_index_by_pool: dict[str, int] = {}

    def __init__(
        self,
        *,
        base_url: str = "",
        base_urls: list[str] | None = None,
        timeout_seconds: float,
        api_key: str = "",
    ) -> None:
        raw_urls = list(base_urls or [])
        if base_url.strip():
            raw_urls.append(base_url)
        normalized_urls = _unique_preserving_order(
            normalized for normalized in (_normalize_base_url(url) for url in raw_urls) if normalized
        )
        if not normalized_urls:
            raise JobeMisconfiguredError("JOBE base URL is not configured")
        self._base_urls: tuple[str, ...] = tuple(normalized_urls)
        self._pool_key = "|".join(self._base_urls)
        self._timeout = httpx.Timeout(timeout_seconds)
        self._api_key = api_key.strip()

    def _client_kwargs(self, *, base_url: str) -> dict[str, Any]:
        kwargs: dict[str, Any] = {"base_url": base_url, "timeout": self._timeout}
        if self._api_key:
            kwargs["headers"] = {"X-API-KEY": self._api_key}
        return kwargs

    @classmethod
    def reset_circuit_breaker_state_for_tests(cls) -> None:
        with cls._circuit_lock:
            cls._circuit_states.clear()
        with cls._selection_lock:
            cls._next_start_index_by_pool.clear()

    def _circuit_enabled(self) -> bool:
        return bool(settings.jobe_circuit_breaker_enabled)

    def _get_or_create_circuit_state(self, *, base_url: str) -> _CircuitState:
        state = self._circuit_states.get(base_url)
        if state is None:
            state = _CircuitState()
            self._circuit_states[base_url] = state
        return state

    def _candidate_base_urls(self) -> list[str]:
        if len(self._base_urls) <= 1:
            return list(self._base_urls)

        with self._selection_lock:
            start = int(self._next_start_index_by_pool.get(self._pool_key, 0)) % len(self._base_urls)
            self._next_start_index_by_pool[self._pool_key] = (start + 1) % len(self._base_urls)
        ordered = list(self._base_urls[start:]) + list(self._base_urls[:start])
        return ordered

    def _before_circuit_request(self, *, base_url: str) -> None:
        if not self._circuit_enabled():
            return

        with self._circuit_lock:
            state = self._get_or_create_circuit_state(base_url=base_url)
            now = time.monotonic()

            if state.state == "open":
                elapsed = now - state.opened_at_monotonic
                cooldown = float(settings.jobe_circuit_breaker_cooldown_seconds)
                if elapsed < cooldown:
                    remaining_seconds = max(1, int(cooldown - elapsed))
                    raise JobeCircuitOpenError(
                        f"JOBE circuit breaker is open. Retry in ~{remaining_seconds}s."
                    )
                state.state = "half_open"
                state.half_open_probe_active = False

            if state.state == "half_open":
                if state.half_open_probe_active:
                    raise JobeCircuitOpenError(
                        "JOBE circuit breaker is half-open; probe already in progress."
                    )
                state.half_open_probe_active = True

    def _record_circuit_success(self, *, base_url: str) -> None:
        if not self._circuit_enabled():
            return

        with self._circuit_lock:
            state = self._get_or_create_circuit_state(base_url=base_url)
            state.state = "closed"
            state.consecutive_failures = 0
            state.opened_at_monotonic = 0.0
            state.half_open_probe_active = False

    def _record_circuit_failure(self, *, base_url: str) -> None:
        if not self._circuit_enabled():
            return

        with self._circuit_lock:
            state = self._get_or_create_circuit_state(base_url=base_url)
            threshold = int(settings.jobe_circuit_breaker_failure_threshold)
            now = time.monotonic()

            if state.state == "half_open":
                state.state = "open"
                state.opened_at_monotonic = now
                state.consecutive_failures = threshold
                state.half_open_probe_active = False
                return

            state.consecutive_failures += 1
            if state.consecutive_failures >= threshold:
                state.state = "open"
                state.opened_at_monotonic = now
                state.half_open_probe_active = False

    async def _execute_with_circuit(self, op: Callable[[str], Awaitable[T]]) -> T:
        last_error: Exception | None = None
        for base_url in self._candidate_base_urls():
            try:
                self._before_circuit_request(base_url=base_url)
            except JobeCircuitOpenError as exc:
                last_error = exc
                continue

            try:
                result = await op(base_url)
            except JobeCircuitOpenError as exc:
                last_error = exc
                continue
            except Exception as exc:
                self._record_circuit_failure(base_url=base_url)
                last_error = exc
                continue

            self._record_circuit_success(base_url=base_url)
            return result

        if last_error is not None:
            raise last_error
        raise JobeTransientError("No JOBE backends configured")

    async def list_languages(self) -> list[JobeLanguage]:
        async def _op(base_url: str) -> list[JobeLanguage]:
            try:
                async with httpx.AsyncClient(**self._client_kwargs(base_url=base_url)) as client:
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

        return await self._execute_with_circuit(_op)

    async def run(
        self,
        *,
        language_id: str,
        source_code: str,
        stdin: str,
        source_filename: str | None = None,
        file_list: list[tuple[str, str]] | None = None,
        parameters: dict[str, Any] | None = None,
        cputime: int | None = None,
        memorylimit: int | None = None,
        streamsize: float | None = None,
    ) -> JobeRunResult:
        async def _op(base_url: str) -> JobeRunResult:
            run_spec: dict[str, Any] = {
                "language_id": language_id,
                "sourcecode": source_code,
                "input": stdin,
            }
            if source_filename:
                run_spec["sourcefilename"] = source_filename
            if file_list:
                run_spec["file_list"] = [[file_id, file_name] for file_id, file_name in file_list]
            run_parameters: dict[str, Any] = dict(parameters or {})
            if cputime is not None:
                run_parameters["cputime"] = int(cputime)
            if memorylimit is not None:
                run_parameters["memorylimit"] = int(memorylimit)
            if streamsize is not None:
                run_parameters["streamsize"] = float(streamsize)
            if run_parameters:
                run_spec["parameters"] = run_parameters

            payload: dict[str, Any] = {"run_spec": run_spec}

            try:
                async with httpx.AsyncClient(**self._client_kwargs(base_url=base_url)) as client:
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
            if (
                not isinstance(compile_output, str)
                or not isinstance(stdout, str)
                or not isinstance(stderr, str)
            ):
                raise JobeError("Unexpected JOBE response: missing output fields")

            return JobeRunResult(
                outcome=outcome,
                compile_output=compile_output,
                stdout=stdout,
                stderr=stderr,
            )

        return await self._execute_with_circuit(_op)

    async def check_file(self, *, file_id: str) -> bool:
        async def _op(base_url: str) -> bool:
            try:
                async with httpx.AsyncClient(**self._client_kwargs(base_url=base_url)) as client:
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

        return await self._execute_with_circuit(_op)

    async def put_file(self, *, file_id: str, content: bytes) -> None:
        async def _op(base_url: str) -> None:
            try:
                async with httpx.AsyncClient(**self._client_kwargs(base_url=base_url)) as client:
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

        await self._execute_with_circuit(_op)

    async def ensure_file(self, *, file_id: str, content: bytes) -> None:
        if await self.check_file(file_id=file_id):
            return
        await self.put_file(file_id=file_id, content=content)
