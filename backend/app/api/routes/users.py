from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.crud.users import UserEmailTakenError, create_user, get_user, list_users
from app.db.deps import get_db
from app.schemas.user import UserCreate, UserOut

router = APIRouter(prefix="/users")


@router.post("", response_model=UserOut, status_code=status.HTTP_201_CREATED)
async def create_user_endpoint(
    payload: UserCreate,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOut:
    try:
        return await create_user(db, email=str(payload.email), password=payload.password)
    except UserEmailTakenError as exc:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already exists"
        ) from exc


@router.get("", response_model=list[UserOut])
async def list_users_endpoint(
    db: Annotated[AsyncSession, Depends(get_db)],
    offset: int = 0,
    limit: int = 100,
) -> list[UserOut]:
    return await list_users(db, offset=offset, limit=limit)


@router.get("/{user_id}", response_model=UserOut)
async def get_user_endpoint(
    user_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> UserOut:
    user = await get_user(db, user_id=user_id)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user
