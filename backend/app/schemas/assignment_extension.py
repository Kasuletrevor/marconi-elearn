from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field


class AssignmentExtensionUpsert(BaseModel):
    extended_due_date: datetime


class AssignmentExtensionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    user_id: int
    extended_due_date: datetime
    created_at: datetime
    updated_at: datetime

