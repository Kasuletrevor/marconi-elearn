# Agent Guide (Project)

This repository contains **Marconi Elearn**, a web-based educational platform to manage courses, distribute assignments, and collect/auto-grade C/C++ submissions at university scale.

The source of truth for product scope and sequencing is `spec.md` — read that before implementing new features.

## Decisions (So Far)

- Architecture: **Next.js frontend** + **FastAPI backend**.
- Database: **PostgreSQL**.
- Migrations: **Alembic**.
- ORM: **SQLAlchemy 2.0** (async in app; sync for Alembic).
- Auth: **Email + password** with **server-side sessions stored in Postgres** and an **HTTP-only cookie** (session-only cookie lifetime).
- Tenancy: keep a tenant boundary (called **Organization/Workspace**) and scope everything under it.
- Execution: run untrusted code via **JOBE** as a separate service (not inside the API).
- Email: **Gmail SMTP** is acceptable for development/small pilots; production should move to a transactional provider.

## Repo Structure

- `spec.md`: platform spec + roadmap/plan.
- `backend/`: FastAPI service (Python).

## Backend (Python) Practices

- Tooling:
  - Use `uv` for environments and installs (preferred over raw `pip`).
  - Use `uv pip ...` (pip-compatible) and `uv run ...` for commands when convenient.
  - Keep a local `.venv` under `backend/.venv`.
- Code organization:
  - Put DB/business operations in `backend/app/crud/` (testable units).
  - Keep route handlers thin in `backend/app/api/routes/` (request/response + auth + calling CRUD).
  - Shared request dependencies live in `backend/app/api/deps/`.
- DB:
  - App uses async engine (`postgresql+asyncpg`).
  - Alembic uses sync driver (`postgresql+psycopg`).
- Security:
  - Never hardcode secrets; use environment variables / `.env` for local dev.
  - Do not log secrets or connection strings containing credentials.
- Testing:
  - Prefer both layers:
    - CRUD-layer tests (fast)
    - API-level tests via ASGI client (confidence)
  - Tests isolate DB state per test using a unique Postgres schema.

## Workflow Notes

- Plan-of-record: update and follow `spec.md`.
- Keep changes small, reversible, and aligned to current milestone order in `spec.md`.

