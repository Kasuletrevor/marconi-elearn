from __future__ import annotations

from pydantic import BaseModel


class CourseNotificationPreferencesOut(BaseModel):
    course_id: int
    notify_new_submissions: bool


class CourseNotificationPreferencesUpdate(BaseModel):
    notify_new_submissions: bool

