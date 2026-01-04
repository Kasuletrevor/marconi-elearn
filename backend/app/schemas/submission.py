from datetime import datetime

from pydantic import BaseModel, ConfigDict


class SubmissionOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    assignment_id: int
    user_id: int
    file_name: str
    content_type: str | None
    size_bytes: int
    created_at: datetime

