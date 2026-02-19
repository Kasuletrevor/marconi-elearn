from __future__ import annotations

from dataclasses import dataclass
import hashlib
from pathlib import Path
import shlex
import tempfile
from typing import Any

from app.core.config import settings
from app.integrations.jobe import JOBE_OUTCOME_OK, JobeClient
from app.models.assignment import Assignment
from app.worker.zip_extract import ZipExtractionError, safe_extract_zip


def _normalize_newlines(s: str) -> str:
    return s.replace("\r\n", "\n").replace("\r", "\n")


def _normalize_output(s: str, *, comparison_mode: str) -> str:
    normalized = _normalize_newlines(s)
    if comparison_mode == "exact":
        return normalized
    if comparison_mode == "ignore_whitespace":
        return " ".join(normalized.split())
    if comparison_mode == "ignore_case":
        return normalized.rstrip().casefold()
    # Default "trim"
    return normalized.rstrip()


def _outputs_match(*, actual: str, expected: str, comparison_mode: str) -> bool:
    return _normalize_output(actual, comparison_mode=comparison_mode) == _normalize_output(
        expected,
        comparison_mode=comparison_mode,
    )


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


@dataclass(frozen=True, slots=True)
class PreparedJobeRun:
    language_id: str
    source_code: str
    source_filename: str
    file_list: list[tuple[str, str]] | None
    parameters: dict[str, Any] | None
    cputime: int
    memorylimit: int
    streamsize: float


def _file_id_for_content(content: bytes) -> str:
    return hashlib.md5(content).hexdigest()  # nosec - non-cryptographic ID


def _dedupe_preserving_order(items: list[str]) -> list[str]:
    seen: set[str] = set()
    out: list[str] = []
    for item in items:
        if item in seen:
            continue
        seen.add(item)
        out.append(item)
    return out


def _parse_compile_command(
    compile_command: str,
    *,
    available_files: set[str],
) -> tuple[str, str, str, list[str], list[str], list[str]]:
    # Returns:
    # - compiler ("gcc"|"g++")
    # - language_id ("c"|"cpp")
    # - primary source filename
    # - other source filenames
    # - compile_flags (compileargs)
    # - link_flags (linkargs, excluding other sources)
    cmd = compile_command.strip()
    if not cmd:
        raise ValueError("compile_command is empty")
    if any(ch in cmd for ch in [";", "&", "|", "`", "$", "<", ">"]):
        raise ValueError("compile_command contains disallowed shell characters")

    try:
        tokens = shlex.split(cmd, posix=True)
    except ValueError as exc:
        raise ValueError("compile_command could not be parsed") from exc

    if not tokens:
        raise ValueError("compile_command is empty")

    compiler = tokens[0]
    if compiler == "make":
        raise ValueError("compile_command using 'make' is not supported by JOBE")
    if compiler not in ("gcc", "g++"):
        raise ValueError("compile_command must start with gcc or g++")

    language_id = "c" if compiler == "gcc" else "cpp"

    flags: list[str] = []
    sources: list[str] = []
    i = 1
    while i < len(tokens):
        token = tokens[i]
        if token == "-o":
            i += 2
            continue
        if token.startswith("-o") and len(token) > 2:
            i += 1
            continue
        if token.startswith("./"):
            token = token[2:]

        if "*" in token or "?" in token or "[" in token:
            if token == "*.c":
                sources.extend(sorted([f for f in available_files if f.endswith(".c")]))
                i += 1
                continue
            if token == "*.cpp":
                sources.extend(sorted([f for f in available_files if f.endswith(".cpp")]))
                i += 1
                continue
            raise ValueError("compile_command only supports *.c or *.cpp globs")

        if "/" in token or "\\" in token:
            raise ValueError("compile_command must reference flat filenames only")

        if token.startswith("-"):
            flags.append(token)
        else:
            sources.append(token)
        i += 1

    sources = _dedupe_preserving_order(sources)
    if not sources:
        raise ValueError("compile_command must include at least one source file")

    primary = sources[0]
    other_sources = sources[1:]

    expected_ext = ".c" if language_id == "c" else ".cpp"

    def _validate_source(name: str) -> None:
        if name not in available_files:
            raise ValueError(f"compile_command references missing file: {name}")
        ext = Path(name).suffix.lower()
        if ext != expected_ext:
            raise ValueError(
                f"compile_command source files must be {expected_ext} (found: {name})"
            )

    _validate_source(primary)
    for src in other_sources:
        _validate_source(src)

    compile_flags: list[str] = []
    link_flags: list[str] = []
    for f in flags:
        if f.startswith(("-l", "-L", "-Wl,")):
            link_flags.append(f)
        else:
            compile_flags.append(f)

    return compiler, language_id, primary, other_sources, compile_flags, link_flags


def _default_primary_and_sources(
    *,
    available_files: set[str],
) -> tuple[str, str, str, list[str]]:
    c_files = sorted([f for f in available_files if f.endswith(".c")])
    cpp_files = sorted([f for f in available_files if f.endswith(".cpp")])

    if c_files and cpp_files:
        raise ZipExtractionError(
            "ZIP contains both .c and .cpp files; configure compile_command"
        )
    if c_files:
        primary = "main.c" if "main.c" in available_files else (c_files[0] if len(c_files) == 1 else "")
        if not primary:
            raise ZipExtractionError(
                "Multi-file C ZIP requires compile_command or a single .c file (or main.c)"
            )
        other_sources = [f for f in c_files if f != primary]
        return "gcc", "c", primary, other_sources
    if cpp_files:
        primary = "main.cpp" if "main.cpp" in available_files else (cpp_files[0] if len(cpp_files) == 1 else "")
        if not primary:
            raise ZipExtractionError(
                "Multi-file C++ ZIP requires compile_command or a single .cpp file (or main.cpp)"
            )
        other_sources = [f for f in cpp_files if f != primary]
        return "g++", "cpp", primary, other_sources

    raise ZipExtractionError("ZIP does not contain any .c or .cpp source files")


async def prepare_jobe_run(
    jobe: JobeClient,
    *,
    submission_path: Path,
    assignment: Assignment | None,
) -> PreparedJobeRun:
    if not submission_path.exists():
        raise ZipExtractionError("Submission file missing on server")

    if submission_path.suffix.lower() != ".zip":
        language_id = _language_id_for_path(submission_path)
        if language_id is None:
            raise ZipExtractionError(f"Unsupported submission type: {submission_path.suffix}")
        return PreparedJobeRun(
            language_id=language_id,
            source_code=submission_path.read_text(encoding="utf-8", errors="replace"),
            source_filename=submission_path.name,
            file_list=None,
            parameters=None,
            cputime=settings.jobe_grading_cputime_seconds,
            memorylimit=settings.jobe_grading_memorylimit_mb,
            streamsize=settings.jobe_grading_streamsize_mb,
        )

    if assignment is None:
        raise ZipExtractionError("Internal error: assignment context missing for ZIP grading")
    if not bool(getattr(assignment, "allows_zip", False)):
        raise ZipExtractionError("This assignment does not accept ZIP submissions")

    expected_filename = (assignment.expected_filename or "").strip() or None
    compile_command = (assignment.compile_command or "").strip() or None

    with tempfile.TemporaryDirectory(prefix="marconi_zip_") as tmp:
        tmp_dir = Path(tmp)
        extracted = safe_extract_zip(submission_path, tmp_dir)
        by_name: dict[str, Path] = {p.name: p for p in extracted}
        available_files = set(by_name.keys())

        if expected_filename:
            if expected_filename not in by_name:
                raise ZipExtractionError(f"Required file '{expected_filename}' not found in ZIP")
            primary_name = expected_filename
            language_id = _language_id_for_path(by_name[primary_name])
            if language_id not in ("c", "cpp"):
                raise ZipExtractionError("Expected file must be .c or .cpp")
            other_sources: list[str] = []
            compile_flags: list[str] = []
            link_flags: list[str] = []
        elif compile_command:
            _, language_id, primary_name, other_sources, compile_flags, link_flags = _parse_compile_command(
                compile_command,
                available_files=available_files,
            )
        else:
            _, language_id, primary_name, other_sources = _default_primary_and_sources(
                available_files=available_files
            )
            compile_flags = []
            link_flags = []

        primary_path = by_name[primary_name]
        source_code = primary_path.read_text(encoding="utf-8", errors="replace")

        file_list: list[tuple[str, str]] = []
        for name, path in by_name.items():
            if name == primary_name:
                continue
            content = path.read_bytes()
            file_id = _file_id_for_content(content)
            await jobe.ensure_file(file_id=file_id, content=content)
            file_list.append((file_id, name))

        parameters: dict[str, Any] = {}
        if compile_flags:
            parameters["compileargs"] = " ".join(compile_flags)
        linkargs_tokens = _dedupe_preserving_order(other_sources + link_flags)
        if linkargs_tokens:
            parameters["linkargs"] = " ".join(linkargs_tokens)

        return PreparedJobeRun(
            language_id=language_id,
            source_code=source_code,
            source_filename=primary_name,
            file_list=file_list or None,
            parameters=parameters or None,
            cputime=settings.jobe_grading_cputime_seconds,
            memorylimit=settings.jobe_grading_memorylimit_mb,
            streamsize=settings.jobe_grading_streamsize_mb,
        )


async def run_test_case(
    jobe: JobeClient,
    *,
    prepared: PreparedJobeRun,
    stdin: str,
    expected_stdout: str,
    expected_stderr: str,
    comparison_mode: str = "trim",
) -> RunCheck:
    result = await jobe.run(
        language_id=prepared.language_id,
        source_code=prepared.source_code,
        stdin=stdin,
        source_filename=prepared.source_filename,
        file_list=prepared.file_list,
        parameters=prepared.parameters,
        cputime=prepared.cputime,
        memorylimit=prepared.memorylimit,
        streamsize=prepared.streamsize,
    )

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
        result.outcome == JOBE_OUTCOME_OK
        and _outputs_match(
            actual=result.stdout,
            expected=expected_stdout,
            comparison_mode=comparison_mode,
        )
        and _outputs_match(
            actual=result.stderr,
            expected=expected_stderr,
            comparison_mode=comparison_mode,
        )
    )
    return RunCheck(
        passed=passed,
        outcome=result.outcome,
        compile_output=result.compile_output,
        stdout=result.stdout,
        stderr=result.stderr,
    )
