from pydantic import BaseModel, Field


class CourseSelfEnrollRequest(BaseModel):
    code: str = Field(min_length=1, max_length=32)
    full_name: str = Field(min_length=1, max_length=200)
    student_number: str = Field(min_length=1, max_length=50)
    programme: str = Field(min_length=1, max_length=200)

