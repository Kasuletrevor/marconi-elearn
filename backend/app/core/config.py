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
    cors_allow_origins: str = "http://localhost:3000"

    model_config = SettingsConfigDict(
        env_file=str((Path(__file__).resolve().parents[3] / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings: Settings = Settings()  # type: ignore[call-arg]
