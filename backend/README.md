# Marconi Elearn Backend (FastAPI)

## Local setup

Prereqs:
- Postgres running locally
- `DATABASE_URL` set (repo root `.env` is supported)

Install and run (using `uv`):
- `uv venv`
- `uv pip install -e ".[dev]"`
- `uv run uvicorn app.main:app --reload --port 8000`

Migrations:
- `uv run alembic upgrade head`
- `uv run alembic revision --autogenerate -m "..."` (after model changes)

