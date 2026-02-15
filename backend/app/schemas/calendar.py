from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel


class CalendarEventBase(BaseModel):
    assignment_id: int
    assignment_title: str
    course_id: int
    course_code: str
    course_title: str
    due_date: datetime


class StudentCalendarEventOut(CalendarEventBase):
    effective_due_date: datetime
    has_extension: bool


class StaffCalendarEventOut(CalendarEventBase):
    pass
