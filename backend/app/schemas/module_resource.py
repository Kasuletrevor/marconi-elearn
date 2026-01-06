from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field, HttpUrl

from app.models.module_resource import ModuleResourceKind


class ModuleResourceCreateLink(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    url: HttpUrl
    position: int = 0
    is_published: bool = False


class ModuleResourceUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    url: HttpUrl | None = None
    position: int | None = None
    is_published: bool | None = None


class ModuleResourceOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    module_id: int
    kind: ModuleResourceKind
    title: str
    url: str | None
    file_name: str | None
    content_type: str | None
    size_bytes: int | None
    position: int
    is_published: bool
    created_at: datetime

