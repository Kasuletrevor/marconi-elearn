from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.core.security import verify_password
from app.crud.sessions import create_session, delete_session, get_session_by_token
from app.crud.users import get_user_by_email
from app.db.deps import get_db
from app.models.user import User
from app.schemas.auth import LoginRequest, MeResponse

router = APIRouter(prefix="/auth")


@router.post("/login", response_model=MeResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeResponse:
    user = await get_user_by_email(db, email=str(payload.email))
    if user is None or not verify_password(payload.password, user.password_hash):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token, _ = await create_session(db, user_id=user.id)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
    )
    return MeResponse(id=user.id, email=user.email)


@router.get("/me", response_model=MeResponse)
async def me(current_user: Annotated[User, Depends(get_current_user)]) -> MeResponse:
    return MeResponse(id=current_user.id, email=current_user.email)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        existing = await get_session_by_token(db, token=token)
        if existing is not None:
            await delete_session(db, session=existing)
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    return None

