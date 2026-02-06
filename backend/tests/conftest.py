import asyncio
import os
from collections.abc import AsyncGenerator
from pathlib import Path
from uuid import uuid4

import pytest
from dotenv import load_dotenv
from httpx import ASGITransport, AsyncClient
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine



if os.name == "nt":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())  # type: ignore[attr-defined]

backend_env = Path(__file__).parent.parent / ".env"
root_env = Path(__file__).resolve().parents[2] / ".env"
if backend_env.exists():
    load_dotenv(backend_env)
else:
    load_dotenv(root_env)

# Deterministic superadmin credentials for tests.
os.environ["SUPERADMIN_EMAILS"] = "admin@example.com"
os.environ["SUPERADMIN_PASSWORD"] = "password123"
os.environ["JOBE_ALLOWED_LANGUAGES"] = "c,cpp"
# Avoid external services during tests.
os.environ["REDIS_URL"] = ""
os.environ["RATE_LIMIT_LOGIN_PER_MINUTE"] = "100000"
os.environ["RATE_LIMIT_EXECUTION_PER_MINUTE"] = "100000"
os.environ["RATE_LIMIT_UPLOADS_PER_MINUTE"] = "100000"

from app.main import app  # noqa: E402


def _async_db_url() -> str:
    url = os.environ.get("DATABASE_URL")
    if not url:
        raise RuntimeError("DATABASE_URL is required for tests")
    if url.startswith("postgresql+asyncpg://"):
        return url
    if url.startswith("postgresql://"):
        return url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


@pytest.fixture()
async def db() -> AsyncGenerator[AsyncSession, None]:
    from sqlalchemy import text

    from app.db.base import Base

    engine = create_async_engine(_async_db_url(), pool_pre_ping=True)
    test_schema = f"test_{uuid4().hex}"
    async_session = async_sessionmaker(engine, expire_on_commit=False)

    async with engine.begin() as conn:
        await conn.exec_driver_sql(f"CREATE SCHEMA {test_schema}")
        await conn.execute(text(f"SET search_path TO {test_schema}"))
        await conn.run_sync(Base.metadata.create_all)
    async with async_session() as session:
        await session.execute(text(f"SET search_path TO {test_schema}"))
        yield session
        await session.rollback()
    async with engine.begin() as conn:
        await conn.execute(text(f"SET search_path TO {test_schema}"))
        await conn.run_sync(Base.metadata.drop_all)
        await conn.exec_driver_sql(f"DROP SCHEMA {test_schema} CASCADE")
    await engine.dispose()


@pytest.fixture()
async def client(db: AsyncSession) -> AsyncGenerator[AsyncClient, None]:
    from sqlalchemy import text
    from app.db.deps import get_db

    async def _override_get_db():
        yield db

    app.dependency_overrides[get_db] = _override_get_db
    try:
        transport = ASGITransport(app=app)
        async with AsyncClient(transport=transport, base_url="http://test") as c:
            await db.execute(text("SELECT 1"))
            yield c
    finally:
        app.dependency_overrides.clear()
