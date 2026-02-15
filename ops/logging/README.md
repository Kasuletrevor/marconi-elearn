# Marconi Logging Stack (Production Baseline)

This package deploys a least-privilege log platform for Marconi using Grafana, Loki, and Promtail.

## What this gives you

- Centralized log collection from Docker containers.
- Service labels for key workloads (`backend`, `worker`, `deadline_poller`, `jobe`, `nginx`).
- Query-only access via Grafana Viewer service-account token.
- No direct SSH needed for log triage.

## 1) Deploy

```bash
cd /opt/marconi-logging
cp .env.example .env
# edit .env and set a strong GF_SECURITY_ADMIN_PASSWORD
# optional: set LOG_STACK_PREFIX to avoid host-level container name conflicts

docker compose up -d
```

Default container names with this template are:
- `${LOG_STACK_PREFIX:-marconi-elearn-logs}-loki`
- `${LOG_STACK_PREFIX:-marconi-elearn-logs}-grafana`
- `${LOG_STACK_PREFIX:-marconi-elearn-logs}-promtail`

## 2) Access safely

- Grafana listens on `127.0.0.1:3001`.
- Loki listens on `127.0.0.1:3100`.
- Publish Grafana through your reverse proxy over HTTPS only (example domain: `logs.yourdomain.com`).
- Do not expose 3001/3100 directly to the internet.

## 3) Create query-only token

1. Sign in as Grafana admin.
2. Go to **Administration -> Service accounts**.
3. Create account: `log-reader` with role `Viewer`.
4. Create token with expiry (24h or 72h).
5. Share only:
   - Grafana URL
   - token
   - requested time window
   - target services

Revoke the token after the incident session.

## 4) Validate ingestion

In Grafana Explore (Loki datasource), run:

```logql
{service="backend"}
```

```logql
{service="worker"} |= "grade_submission"
```

```logql
{service="jobe"} |= "compile"
```

## 5) Operational thresholds (start point)

- Queue depth > `100` for `10` minutes.
- Median grading latency > `2x` baseline for `15` minutes.
- Job failure rate > `5%` over `15` minutes.
- JOBE health check fails on `3` consecutive probes.

## 6) Maintenance

- Keep image versions pinned.
- Test upgrades in staging before production.
- Rotate Grafana admin password and review service-account tokens monthly.
- Ensure Loki disk usage stays below 80%.

## Notes on privilege

Promtail uses the Docker socket for container metadata labeling. This is common for Docker log discovery, but still sensitive. Keep this stack on trusted hosts only and do not expose Promtail/Loki endpoints publicly.
