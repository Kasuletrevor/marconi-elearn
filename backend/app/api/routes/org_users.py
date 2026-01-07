from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import EmailStr
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.users import get_user_by_email
from app.db.deps import get_db
from app.schemas.user import UserOut

router = APIRouter(prefix="/orgs/{org_id}/users")


@router.get(
    "/lookup",
    response_model=UserOut,
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)
async def lookup_user_by_email_endpoint(
    org_id: int,
    email: EmailStr,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOut:
    user = await get_user_by_email(db, email=str(email))
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
