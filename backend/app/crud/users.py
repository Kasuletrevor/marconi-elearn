from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.security import hash_password
from app.models.user import User


class UserEmailTakenError(Exception):
    pass


async def get_user_by_email(db: AsyncSession, *, email: str) -> User | None:
    result = await db.execute(select(User).where(User.email == email.lower()))
    return result.scalars().first()


async def create_user(db: AsyncSession, *, email: str, password: str) -> User:
    user = User(email=email.lower(), password_hash=hash_password(password))
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise UserEmailTakenError from exc
    await db.refresh(user)
    return user


async def create_pending_user(db: AsyncSession, *, email: str) -> User:
    user = User(email=email.lower(), password_hash=None)
    db.add(user)
    try:
        await db.commit()
    except IntegrityError as exc:
        await db.rollback()
        raise UserEmailTakenError from exc
    await db.refresh(user)
    return user


async def list_users(db: AsyncSession, *, offset: int = 0, limit: int = 100) -> list[User]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)
    result = await db.execute(select(User).order_by(User.id).offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_user(db: AsyncSession, *, user_id: int) -> User | None:
    return await db.get(User, user_id)
