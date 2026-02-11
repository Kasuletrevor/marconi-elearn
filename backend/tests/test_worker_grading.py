import pytest

from app.integrations.jobe import JOBE_OUTCOME_OK, JobeRunResult
from app.worker.grading import PreparedJobeRun, run_test_case


class _FakeJobeClient:
    def __init__(self, result: JobeRunResult) -> None:
        self._result = result

    async def run(self, **kwargs) -> JobeRunResult:
        return self._result


@pytest.mark.asyncio
async def test_run_test_case_fails_when_runtime_outcome_is_not_ok() -> None:
    prepared = PreparedJobeRun(
        language_id="c",
        source_code="int main(){return 0;}",
        source_filename="main.c",
        file_list=None,
        parameters=None,
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
