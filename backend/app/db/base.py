from sqlalchemy.orm import DeclarativeBase


class Base(DeclarativeBase):
    pass


# Ensure all models are imported before `Base.metadata.create_all()` (tests rely on this).
from app import models as _models  # noqa: E402,F401
