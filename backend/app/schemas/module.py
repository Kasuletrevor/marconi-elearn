from pydantic import BaseModel, ConfigDict, Field


class ModuleCreate(BaseModel):
    title: str = Field(min_length=1, max_length=200)
    position: int = 0


class ModuleUpdate(BaseModel):
    title: str | None = Field(default=None, min_length=1, max_length=200)
    position: int | None = None


class ModuleOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    course_id: int
    title: str
    position: int

