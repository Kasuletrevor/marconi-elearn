import pytest
import hashlib

from app.integrations.jobe import JOBE_OUTCOME_OK, JobeRunResult
from app.core.config import settings
from app.worker.grading import (
    PreparedJobeRun,
    _file_id_for_content,
    prepare_jobe_run,
    run_test_case,
)


class _FakeJobeClient:
    def __init__(self, result: JobeRunResult) -> None:
        self._result = result
        self.last_run_kwargs: dict | None = None

    async def run(self, **kwargs) -> JobeRunResult:
        self.last_run_kwargs = kwargs
        return self._result


@pytest.mark.asyncio
async def test_run_test_case_fails_when_runtime_outcome_is_not_ok() -> None:
    prepared = PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}",
        source_filename="main.c",
        file_list=None,
        parameters=None,
        cputime=10,
        memorylimit=256,
        streamsize=0.064,
    )
    fake_jobe = _FakeJobeClient(
        JobeRunResult(
            outcome=11,
            compile_output="",
            stdout="ok\n",
            stderr="",
        )
    )

    result = await run_test_case(
        fake_jobe,
        prepared=prepared,
        stdin="",
        expected_stdout="ok\n",
        expected_stderr="",
    )

    assert result.passed is False
    assert result.outcome == 11


@pytest.mark.asyncio
async def test_run_test_case_passes_only_when_outcome_is_ok_and_output_matches() -> None:
    prepared = PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}",
        source_filename="main.c",
        file_list=None,
        parameters=None,
        cputime=10,
        memorylimit=256,
        streamsize=0.064,
    )
    fake_jobe = _FakeJobeClient(
        JobeRunResult(
            outcome=JOBE_OUTCOME_OK,
            compile_output="",
            stdout="ok\r\n",
            stderr="",
        )
    )

    result = await run_test_case(
        fake_jobe,
        prepared=prepared,
        stdin="",
        expected_stdout="ok\n",
        expected_stderr="",
    )

    assert result.passed is True
    assert result.outcome == JOBE_OUTCOME_OK
    assert fake_jobe.last_run_kwargs is not None
    assert fake_jobe.last_run_kwargs["cputime"] == 10
    assert fake_jobe.last_run_kwargs["memorylimit"] == 256
    assert fake_jobe.last_run_kwargs["streamsize"] == 0.064


@pytest.mark.asyncio
async def test_run_test_case_exact_mode_requires_identical_trailing_whitespace() -> None:
    prepared = PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}",
        source_filename="main.c",
        file_list=None,
        parameters=None,
        cputime=10,
        memorylimit=256,
        streamsize=0.064,
    )
    fake_jobe = _FakeJobeClient(
        JobeRunResult(
            outcome=JOBE_OUTCOME_OK,
            compile_output="",
            stdout="ok\n",
            stderr="",
        )
    )

    result = await run_test_case(
        fake_jobe,
        prepared=prepared,
        stdin="",
        expected_stdout="ok",
        expected_stderr="",
        comparison_mode="exact",
    )

    assert result.passed is False


@pytest.mark.asyncio
async def test_run_test_case_ignore_whitespace_mode_collapses_spacing() -> None:
    prepared = PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}",
        source_filename="main.c",
        file_list=None,
        parameters=None,
        cputime=10,
        memorylimit=256,
        streamsize=0.064,
    )
    fake_jobe = _FakeJobeClient(
        JobeRunResult(
            outcome=JOBE_OUTCOME_OK,
            compile_output="",
            stdout="value   42\n",
            stderr="",
        )
    )

    result = await run_test_case(
        fake_jobe,
        prepared=prepared,
        stdin="",
        expected_stdout="value 42",
        expected_stderr="",
        comparison_mode="ignore_whitespace",
    )

    assert result.passed is True


@pytest.mark.asyncio
async def test_run_test_case_ignore_case_mode_is_case_insensitive() -> None:
    prepared = PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}",
        source_filename="main.c",
        file_list=None,
        parameters=None,
        cputime=10,
        memorylimit=256,
        streamsize=0.064,
    )
    fake_jobe = _FakeJobeClient(
        JobeRunResult(
            outcome=JOBE_OUTCOME_OK,
            compile_output="",
            stdout="HELLO MARCONI\n",
            stderr="",
        )
    )

    result = await run_test_case(
        fake_jobe,
        prepared=prepared,
        stdin="",
        expected_stdout="hello marconi",
        expected_stderr="",
        comparison_mode="ignore_case",
    )

    assert result.passed is True


@pytest.mark.asyncio
async def test_prepare_jobe_run_applies_default_resource_caps(tmp_path) -> None:
    source_path = tmp_path / "main.c"
    source_path.write_text("int main(){return 0;}\n", encoding="utf-8")
    fake_jobe = _FakeJobeClient(
        JobeRunResult(
            outcome=JOBE_OUTCOME_OK,
            compile_output="",
            stdout="",
            stderr="",
        )
    )

    prepared = await prepare_jobe_run(
        fake_jobe,
        submission_path=source_path,
        assignment=None,
    )

    assert prepared.cputime == settings.jobe_grading_cputime_seconds
    assert prepared.memorylimit == settings.jobe_grading_memorylimit_mb
    assert prepared.streamsize == settings.jobe_grading_streamsize_mb


def test_file_id_for_content_uses_sha256() -> None:
    content = b"int main(){return 0;}\n"
    file_id = _file_id_for_content(content)
    assert file_id == hashlib.sha256(content).hexdigest()
    assert len(file_id) == 64
