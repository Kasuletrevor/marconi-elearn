import hashlib
import secrets

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.session import Session


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def create_session(db: AsyncSession, *, user_id: int) -> tuple[str, Session]:
    token = secrets.token_urlsafe(32)
    token_hash = _hash_token(token)
    session = Session(user_id=user_id, token_hash=token_hash)
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return token, session


async def get_session_by_token(db: AsyncSession, *, token: str) -> Session | None:
    token_hash = _hash_token(token)
    result = await db.execute(select(Session).where(Session.token_hash == token_hash))
    return result.scalars().first()


async def delete_session(db: AsyncSession, *, session: Session) -> None:
    await db.delete(session)
    await db.commit()

