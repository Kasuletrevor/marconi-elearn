from __future__ import annotations

from pydantic import BaseModel, Field


class PlaygroundLanguage(BaseModel):
    id: str
    version: str


class PlaygroundRunRequest(BaseModel):
    language_id: str = Field(min_length=1, max_length=32)
    source_code: str = Field(min_length=1, max_length=200_000)
    stdin: str = Field(default="", max_length=200_000)


class PlaygroundRunResponse(BaseModel):
    outcome: int
    compile_output: str
    stdout: str
    stderr: str

