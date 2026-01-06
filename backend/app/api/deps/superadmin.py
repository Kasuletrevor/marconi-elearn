from typing import Annotated

from fastapi import Depends, HTTPException, status

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.models.user import User


def _normalized_emails() -> set[str]:
    return {e.strip().lower() for e in settings.superadmin_emails.split(",") if e.strip()}


def is_superadmin(user: User) -> bool:
    return user.email.lower() in _normalized_emails()


async def require_superadmin(current_user: Annotated[User, Depends(get_current_user)]) -> User:
    if not is_superadmin(current_user):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Super admin required")
    return current_user
