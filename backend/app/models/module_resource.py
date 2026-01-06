from __future__ import annotations

import enum
from datetime import datetime

from sqlalchemy import Boolean, DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column

from app.db.base import Base


class ModuleResourceKind(str, enum.Enum):
    link = "link"
    file = "file"


class ModuleResource(Base):
    __tablename__ = "module_resources"

    id: Mapped[int] = mapped_column(primary_key=True)
    module_id: Mapped[int] = mapped_column(ForeignKey("modules.id", ondelete="CASCADE"), index=True)
    kind: Mapped[ModuleResourceKind] = mapped_column(Enum(ModuleResourceKind, name="module_resource_kind"), index=True)
    title: Mapped[str] = mapped_column(String(200))

    url: Mapped[str | None] = mapped_column(String(2000), nullable=True, default=None)
    file_name: Mapped[str | None] = mapped_column(String(255), nullable=True, default=None)
    content_type: Mapped[str | None] = mapped_column(String(100), nullable=True, default=None)
    size_bytes: Mapped[int | None] = mapped_column(Integer, nullable=True)
    storage_path: Mapped[str | None] = mapped_column(String(500), nullable=True, default=None)

    position: Mapped[int] = mapped_column(Integer, default=0)
    is_published: Mapped[bool] = mapped_column(Boolean, server_default="false", nullable=False, index=True)

    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
