# Marconi Elearn (Classroom)

A web-based platform for university-scale course management and programming
assignment auto-grading (C/C++) with execution isolation via JOBE.

The plan-of-record lives in `spec.md`.

## What you get

- **Organizations (Workspaces)** with role-based access control.
- **Courses** with modules/resources and staff + student rosters.
- **Assignments** with submissions, grading lifecycle, and staff review.
- **Auto-grading** via **JOBE** (never executes untrusted code inside the API).
- **Async processing**: grading is queued (Redis) and executed by a worker.
- **In-app notifications** (email delivery is optional; not required for local testing).

## Roles (high level)

- **Super Admin**: global admin (org creation, bootstrapping, platform ops).
- **Org Admin**: manages an organization and its memberships.
- **Course Owner / Staff**: manages course content, assignments, and grading.
- **Student**: enrolls in courses, submits assignments, views results.

## Architecture

- **Frontend**: Next.js (App Router) in `frontend/`.
- **Backend**: FastAPI + SQLAlchemy 2 + Alembic in `backend/`.
- **Database**: Postgres.
- **Queue**: Redis + Taskiq worker.
- **Execution**: JOBE (separate service).
- **Auth**: email+password with server-side sessions stored in Postgres and an
  HTTP-only cookie.

## Repository layout

- `spec.md`: product spec + roadmap.
- `USER_JOURNEY.md`: role-based UX + API map.
- `review.md`: known gaps / next upgrades checklist.
- `docs/`: deeper design docs (autograding UX, ZIP support, etc.).
- `backend/`: FastAPI service, migrations, worker.
- `frontend/`: Next.js web app.

## Local development

### Prereqs

- Node.js (20+ recommended)
- Python (3.12+ recommended) and `uv`
- Docker (for Postgres, Redis, JOBE)

### 1) Configure environment

Copy the example env file and adjust values:

```bash
cp .env.example .env
```

Key variables to review:

- `DATABASE_URL`
- `REDIS_URL`
- `JOBE_BASE_URL` (must include `/restapi`)
- `NEXT_PUBLIC_API_URL`

### 2) Start dependencies (Docker)

This repo includes `backend/docker-compose.yml`, but it is deployment-oriented
and references external Docker networks. For local dev, the simplest path is to
run services directly.

PowerShell (Windows):

```powershell
docker run -d --name marconi-postgres `
  -e POSTGRES_USER=marconi_user `
  -e POSTGRES_PASSWORD=your_secure_password_here `
  -e POSTGRES_DB=marconi `
  -p 5432:5432 postgres:16-alpine

docker run -d --name marconi-redis -p 6379:6379 redis:alpine

docker run -d --name marconi-jobe -p 8081:80 trampgeek/jobeinabox:latest
```

bash (macOS/Linux):

```bash
docker run -d --name marconi-postgres \
  -e POSTGRES_USER=marconi_user \
  -e POSTGRES_PASSWORD=your_secure_password_here \
  -e POSTGRES_DB=marconi \
  -p 5432:5432 postgres:16-alpine

docker run -d --name marconi-redis -p 6379:6379 redis:alpine

docker run -d --name marconi-jobe -p 8081:80 trampgeek/jobeinabox:latest
```

Then set `JOBE_BASE_URL` to:

```text
http://localhost:8081/jobe/index.php/restapi
```

### 3) Backend (API + migrations)

```bash
cd backend
uv venv
uv pip install -e ".[dev]"
uv run alembic upgrade head
uv run uvicorn app.main:app --reload --port 8000
```

FastAPI docs:

- OpenAPI: `http://localhost:8000/docs`

### 4) Worker (grading)

The worker is required for auto-grading and async submission processing:

```bash
cd backend
uv run taskiq worker app.worker.broker:broker app.worker.tasks
```

### 5) Frontend

```bash
cd frontend
npm install
npm run dev
```

Frontend runs at `http://localhost:3000`.

## Auto-grading UX (how it works)

At a high level:

1. Staff create an assignment and define grading configuration (including test
   cases when applicable).
2. Students submit code (single `.c/.cpp` or ZIP when enabled).
3. The API stores the submission and enqueues a grading job.
4. The worker pulls the job, runs compilation/execution via JOBE, then persists
   results back to Postgres for the UI to display.

See:

- `docs/autograding-ux.md` (staff-first UX map and expectations)

## ZIP submissions (C/C++)

Assignments can optionally allow ZIP uploads for multi-file projects. ZIPs are
inspected/extracted in the **worker** with safety limits (flat structure,
bounded size, traversal protection). See:

- `docs/zip-extraction-feature.md`

## Testing

Backend:

```bash
cd backend
uv run pytest
```

Frontend:

```bash
cd frontend
npm run lint
npm run build
```

## Deployment

See `DEPLOYMENT.md`. If you use `backend/docker-compose.yml`, read it carefully:
it assumes external networks and is intended for server deployments.

## Known gaps / "what's next"

This is a production-facing system; treat changes as having production impact.
Current gaps and planned follow-ups live in:

- `review.md`
- `spec.md`
