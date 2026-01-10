from pathlib import Path
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict
from sqlalchemy.engine import URL

SameSitePolicy = Literal["lax", "strict", "none"]


class Settings(BaseSettings):
    database_url: str = ""

    # Postgres components (preferred in Docker/production because URL-encoding is handled safely)
    postgres_user: str = ""
    postgres_password: str = ""
    postgres_host: str = ""
    postgres_port: int = 5432
    postgres_db: str = ""

    session_cookie_name: str = "marconi_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: SameSitePolicy = "lax"
    # Comma-separated list. Kept as string to avoid Pydantic JSON parsing for list types in .env.
    superadmin_emails: str = ""
    # Optional: enables first-login bootstrap for configured superadmins.
    # If empty, superadmins must be created via DB or an admin-only endpoint.
    superadmin_password: str = ""
    cors_allow_origins: str = "http://localhost:3000"
    jobe_base_url: str = ""
    jobe_timeout_seconds: float = 20.0
    # Comma-separated list. If empty, no filtering is applied.
    jobe_allowed_languages: str = "c,cpp"
    # Queue/worker
    redis_url: str = ""
    taskiq_queue_name: str = "marconi"

    model_config = SettingsConfigDict(
        env_file=str((Path(__file__).resolve().parents[3] / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )

    @model_validator(mode="after")
    def _finalize(self) -> "Settings":
        # Prefer component-based configuration when available (avoids unescaped @/:/? in passwords).
        if self.postgres_user and self.postgres_db:
            host = self.postgres_host or "localhost"
            url = URL.create(
                drivername="postgresql+asyncpg",
                username=self.postgres_user,
                password=self.postgres_password or None,
                host=host,
                port=self.postgres_port or 5432,
                database=self.postgres_db,
            )
            self.database_url = str(url)

        if not self.database_url:
            raise ValueError("DATABASE_URL or POSTGRES_* must be configured")

        return self


settings: Settings = Settings()  # type: ignore[call-arg]
