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
    # Server-side session TTL (days). Cookie is session-only, but server sessions
    # must still expire for safety/cleanup.
    session_ttl_days: int = 30
    # Comma-separated list. Kept as string to avoid Pydantic JSON parsing for list types in .env.
    superadmin_emails: str = ""
    # Optional: enables first-login bootstrap for configured superadmins.
    # If empty, superadmins must be created via DB or an admin-only endpoint.
    superadmin_password: str = ""
    cors_allow_origins: str = "http://localhost:3000"
    jobe_base_url: str = ""
    jobe_timeout_seconds: float = 20.0
    # Explicit JOBE run caps for grading workers.
    # JOBE expects cputime (seconds), memorylimit (MB), and streamsize (MB).
    jobe_grading_cputime_seconds: int = 10
    jobe_grading_memorylimit_mb: int = 256
    # 64 KB ~= 0.064 MB (JOBE interprets streamsize in MB).
    jobe_grading_streamsize_mb: float = 0.064
    # Optional API key for JOBE upstream auth (if enabled on the JOBE deployment).
    jobe_api_key: str = ""
    # Comma-separated list. If empty, no filtering is applied.
    jobe_allowed_languages: str = "c,cpp"
    # Queue/worker
    redis_url: str = ""
    taskiq_queue_name: str = "marconi"
    # File uploads
    uploads_dir: str = ""
    # Request rate limits (per minute, per client IP)
    rate_limit_login_per_minute: int = 10
    rate_limit_execution_per_minute: int = 30
    rate_limit_uploads_per_minute: int = 20

    # Third-party integrations
    # Symmetric encryption key (Fernet). Generate with: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
    token_encryption_key: str = ""
    # GitHub App (web application flow)
    github_app_client_id: str = ""
    github_app_client_secret: str = ""
    # Full callback URL registered in the GitHub App settings, e.g. https://api.example.com/api/v1/integrations/github/callback
    github_app_oauth_redirect_url: str = ""

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
            self.database_url = url.render_as_string(hide_password=False)

        if not self.database_url:
            raise ValueError("DATABASE_URL or POSTGRES_* must be configured")

        if not self.uploads_dir.strip():
            self.uploads_dir = str((Path(__file__).resolve().parents[3] / "var" / "uploads"))

        self.jobe_grading_cputime_seconds = max(1, int(self.jobe_grading_cputime_seconds))
        self.jobe_grading_memorylimit_mb = max(1, int(self.jobe_grading_memorylimit_mb))
        self.jobe_grading_streamsize_mb = max(0.001, float(self.jobe_grading_streamsize_mb))

        return self


settings: Settings = Settings()  # type: ignore[call-arg]
