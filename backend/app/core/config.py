from pathlib import Path
from typing import Literal

from pydantic_settings import BaseSettings, SettingsConfigDict

SameSitePolicy = Literal["lax", "strict", "none"]


class Settings(BaseSettings):
    database_url: str
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


settings: Settings = Settings()  # type: ignore[call-arg]
