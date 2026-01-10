from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path

from app.integrations.jobe import JobeClient


def _normalize_output(s: str) -> str:
    # Normalize Windows newlines + trailing EOF whitespace. Do not strip internal whitespace.
    return s.replace("\r\n", "\n").rstrip()


def _language_id_for_path(path: Path) -> str | None:
    ext = path.suffix.lower()
    if ext == ".c":
        return "c"
    if ext == ".cpp":
        return "cpp"
    if ext == ".py":
        return "python3"
    if ext == ".java":
        return "java"
    return None


@dataclass(frozen=True, slots=True)
class RunCheck:
    passed: bool
    outcome: int
    compile_output: str
    stdout: str
    stderr: str


async def run_test_case(
    jobe: JobeClient,
    *,
    submission_path: Path,
    stdin: str,
    expected_stdout: str,
    expected_stderr: str,
) -> RunCheck:
    if not submission_path.exists():
        return RunCheck(
            passed=False,
            outcome=0,
            compile_output="",
            stdout="",
            stderr="Submission file missing on server",
        )
    if submission_path.suffix.lower() == ".zip":
        return RunCheck(
            passed=False,
            outcome=0,
            compile_output="",
            stdout="",
            stderr="ZIP submissions are not supported yet",
        )

    language_id = _language_id_for_path(submission_path)
    if language_id is None:
        return RunCheck(
            passed=False,
            outcome=0,
            compile_output="",
            stdout="",
            stderr=f"Unsupported submission type: {submission_path.suffix}",
        )

    source_code = submission_path.read_text(encoding="utf-8", errors="replace")
    result = await jobe.run(language_id=language_id, source_code=source_code, stdin=stdin)

    # Compile error -> always fail
    if result.compile_output.strip():
        return RunCheck(
            passed=False,
            outcome=result.outcome,
            compile_output=result.compile_output,
            stdout=result.stdout,
            stderr=result.stderr,
        )

    passed = (
        _normalize_output(result.stdout) == _normalize_output(expected_stdout)
        and _normalize_output(result.stderr) == _normalize_output(expected_stderr)
    )
    return RunCheck(
        passed=passed,
        outcome=result.outcome,
        compile_output=result.compile_output,
        stdout=result.stdout,
        stderr=result.stderr,
    )

