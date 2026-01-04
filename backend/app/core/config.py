from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str
    session_cookie_name: str = "marconi_session"
    session_cookie_secure: bool = False
    session_cookie_samesite: str = "lax"

    model_config = SettingsConfigDict(
        env_file=str((Path(__file__).resolve().parents[3] / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()
