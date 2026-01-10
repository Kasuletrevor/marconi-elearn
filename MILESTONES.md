# Milestones

## Current snapshot (compact)
- Working end-to-end: cookie-session auth + role redirects, org/course scaffolding, assignments + file submissions, staff review/grade flows, and MVP auto-grading via Redis/Taskiq + JOBE execution proxy.
- Open work (keep open): JOBE server deployment/operations, plus continued iteration on assignments + submissions (polish, offline packaging, scale/safety hardening).

## 2026-01-03 (current workspace)

- Defined and refined product specification in `spec.md` (roles/tenancy, submissions, execution, AI, ops).
- Set up local Postgres database `marconi_elearn` and added `DATABASE_URL` to `.env`.
- Added `.gitignore` to exclude `.env`.
- Pivoted architecture to `Next.js` frontend + `FastAPI` backend with `SQLAlchemy` + `Alembic`.
- Scaffolded FastAPI backend in `backend/` with `/api/v1/health`.
- Configured Alembic and applied initial migration creating `organizations` table.
- Frontend scaffolding via `create-next-app` is pending (requires network approval for `npm`/`npx`).

## 2026-01-10
- Integrated JOBE execution via authenticated FastAPI proxy endpoints (`/api/v1/playground/*`) and wired the Next.js `/playground` UI to run real code.
- Added Redis + Taskiq worker scaffold for background auto-grading, plus initial TestCase + SubmissionTestResult DB models and staff endpoints to manage test cases.
- Documented worker run commands + env vars in `spec.md`; tests/build are green (`pytest`, `next build`).
- Still open (by design): deploy/own the JOBE server(s) (Render), and keep iterating on assignment/submission workflows (offline PDF+starter ZIP, regrade/queue UX, safety caps/observability).
