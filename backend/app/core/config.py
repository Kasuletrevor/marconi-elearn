from pathlib import Path

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    database_url: str

    model_config = SettingsConfigDict(
        env_file=str((Path(__file__).resolve().parents[3] / ".env")),
        env_file_encoding="utf-8",
        extra="ignore",
    )


settings = Settings()

