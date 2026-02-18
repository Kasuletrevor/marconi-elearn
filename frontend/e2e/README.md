# Frontend test suites

## E2E (Playwright)

Critical user flows live in `frontend/e2e/critical-flows.spec.ts`:

1. login -> submit assignment -> view grade
2. staff grade override
3. invite accept

### Required environment

- Frontend app running (default `http://localhost:3000`)
- Backend API running (default `http://localhost:8000/api/v1`)
- Superadmin credentials with org/course creation access:
  - `E2E_SUPERADMIN_EMAIL`
  - `E2E_SUPERADMIN_PASSWORD`

Fallbacks are supported from `.env`/`backend/.env` (`SUPERADMIN_EMAILS`, `SUPERADMIN_PASSWORD`) and `SMOKE_SUPERADMIN_EMAIL` / `SMOKE_PASSWORD`.

### Run

```bash
cd frontend
npm run test:e2e
```

## Unit/component (Vitest)

Current baseline covers shared UI components and calendar states.

```bash
cd frontend
npm run test:unit
```
