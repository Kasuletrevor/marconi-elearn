from app.core.config import Settings


def test_settings_builds_database_url_from_postgres_parts(monkeypatch) -> None:
    monkeypatch.delenv("DATABASE_URL", raising=False)
    monkeypatch.setenv("POSTGRES_USER", "postgres")
    monkeypatch.setenv("POSTGRES_PASSWORD", "nQ8@postgres")
    monkeypatch.setenv("POSTGRES_DB", "marconi_elearn")
    monkeypatch.setenv("POSTGRES_HOST", "postgres")
    monkeypatch.setenv("POSTGRES_PORT", "5432")

    settings = Settings()
    assert "nQ8%40postgres" in settings.database_url
    assert "***" not in settings.database_url

