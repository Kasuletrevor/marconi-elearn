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
- JOBE config: set `JOBE_BASE_URL` (must include `/restapi`), optionally restrict with `JOBE_ALLOWED_LANGUAGES`, and tune `JOBE_TIMEOUT_SECONDS`.
- Email: **Gmail SMTP** is acceptable for development/small pilots; production should move to a transactional provider.

## Project Management (Linear)

Trevor tracks execution in Linear:
- Linear project: `Marconi Elearn`
- Linear team: `KJT tech solutions`
- Seeded roadmap: 11 critical tasks (infra, grading, AI, operations).

Agent expectations:
- Treat Linear as the execution tracker; treat `spec.md` as the plan-of-record.
- Before starting new work, check Linear for the next highest-priority issue and current status.
- After finishing work, update the relevant Linear issue (status + short notes on what changed).
- Only create new Linear issues if Trevor explicitly asks; otherwise add discoveries to `review.md` and call them out in your handoff.

## Repo Structure

- `spec.md`: platform spec + roadmap/plan.
- `review.md`: known gaps/next upgrades checklist.
- `USER_JOURNEY.md`: role-based navigation and API map (keep in sync with reality).
- `MILESTONES.md`: brief milestone log (high-signal progress snapshots).
- `backend/`: FastAPI service (Python).
- `frontend/`: Next.js app (App Router).

## Backend (Python) Practices

- Tooling:
  - Use `uv` for environments and installs (preferred over raw `pip`).
  - Use `uv pip ...` (pip-compatible) and `uv run ...` for commands when convenient.
  - Keep a local `.venv` under `backend/.venv`.
- Queue/worker:
  - Auto-grading runs via Redis + Taskiq; start a worker with `cd backend; .\\.venv\\Scripts\\taskiq worker app.worker.broker:broker app.worker.tasks`.
  - Postgres is the source of truth for grading status/results; Redis is just the queue.
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
- When behavior changes user flows or roles, update `USER_JOURNEY.md` and (if relevant) add a note to `review.md`.
- Default SCM flow is feature branch -> PR -> merge to `main` (avoid direct commits to `main` unless Trevor explicitly asks for an exception).
