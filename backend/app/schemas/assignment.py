from datetime import datetime
import re
import shlex
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field, model_validator
from app.schemas.late_policy import LatePolicy


_DISALLOWED_COMPILE_CHARS_RE = re.compile(r"[;&|`$<>]")


def _validate_expected_filename(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if "/" in trimmed or "\\" in trimmed:
        raise ValueError("expected_filename must not contain path separators")
    if len(trimmed) > 255:
        raise ValueError("expected_filename is too long")
    if trimmed != "Makefile":
        ext = Path(trimmed).suffix.lower()
        if ext not in {".c", ".cpp"}:
            raise ValueError("expected_filename must be a .c or .cpp file")
    return trimmed


def _validate_compile_command(value: str | None) -> str | None:
    if value is None:
        return None
    trimmed = value.strip()
    if not trimmed:
        return None
    if len(trimmed) > 500:
        raise ValueError("compile_command is too long")
    if _DISALLOWED_COMPILE_CHARS_RE.search(trimmed):
        raise ValueError("compile_command contains disallowed shell characters")

    try:
        tokens = shlex.split(trimmed, posix=True)
    except ValueError as exc:
        raise ValueError("compile_command could not be parsed") from exc

    if not tokens:
        return None
    if tokens[0] == "make":
        raise ValueError("compile_command using 'make' is not supported by JOBE")
    if tokens[0] not in {"gcc", "g++"}:
        raise ValueError("compile_command must start with gcc or g++")

    for token in tokens[1:]:
        if token.startswith("-"):
            continue
        if token.startswith("./"):
            token = token[2:]
        if "/" in token or "\\" in token:
            raise ValueError("compile_command must reference flat filenames only")
    return trimmed


class AssignmentCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    module_id: int | None = None
    due_date: datetime | None = None
    max_points: int = Field(default=100, ge=0, le=1_000_000)
    late_policy: LatePolicy | None = None
    allows_zip: bool = False
    expected_filename: str | None = Field(default=None)
    compile_command: str | None = Field(default=None)

    @model_validator(mode="after")
    def _normalize(self) -> "AssignmentCreate":
        self.expected_filename = _validate_expected_filename(self.expected_filename)
        self.compile_command = _validate_compile_command(self.compile_command)
        if not self.allows_zip and (self.expected_filename or self.compile_command):
            raise ValueError(
                "allows_zip must be true when expected_filename or compile_command is set"
            )
        if self.expected_filename and self.compile_command:
            raise ValueError("expected_filename and compile_command are mutually exclusive")
        return self


class AssignmentUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    description: str | None = Field(default=None, max_length=10_000)
    module_id: int | None = None
    due_date: datetime | None = None
    max_points: int | None = Field(default=None, ge=0, le=1_000_000)
    late_policy: LatePolicy | None = None
    allows_zip: bool | None = None
    expected_filename: str | None = Field(default=None)
    compile_command: str | None = Field(default=None)

    @model_validator(mode="after")
    def _normalize(self) -> "AssignmentUpdate":
        self.expected_filename = _validate_expected_filename(self.expected_filename)
        self.compile_command = _validate_compile_command(self.compile_command)
        fields_set = set(getattr(self, "model_fields_set", set()))
        if "expected_filename" in fields_set and "compile_command" in fields_set:
            if self.expected_filename and self.compile_command:
                raise ValueError("expected_filename and compile_command are mutually exclusive")
        if "allows_zip" in fields_set and self.allows_zip is False:
            if ("expected_filename" in fields_set and self.expected_filename) or (
                "compile_command" in fields_set and self.compile_command
            ):
                raise ValueError(
                    "allows_zip must be true when expected_filename or compile_command is set"
                )
        return self


class AssignmentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    module_id: int | None
    title: str
    description: str | None
    due_date: datetime | None
    max_points: int
    late_policy: dict | None
    allows_zip: bool
    expected_filename: str | None
    compile_command: str | None
