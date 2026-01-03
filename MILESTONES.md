# Milestones

## 2026-01-03 (current workspace)

- Defined and refined product specification in `spec.md` (roles/tenancy, submissions, execution, AI, ops).
- Set up local Postgres database `marconi_elearn` and added `DATABASE_URL` to `.env`.
- Added `.gitignore` to exclude `.env`.
- Pivoted architecture to `Next.js` frontend + `FastAPI` backend with `SQLAlchemy` + `Alembic`.
- Scaffolded FastAPI backend in `backend/` with `/api/v1/health`.
- Configured Alembic and applied initial migration creating `organizations` table.
- Frontend scaffolding via `create-next-app` is pending (requires network approval for `npm`/`npx`).

