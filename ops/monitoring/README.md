# Grading Observability

## Metrics Endpoint

- Prometheus scrape path: `GET /api/v1/metrics`
- Content type: `text/plain; version=0.0.4`

## Core Metrics

- `marconi_grading_queue_depth{status}` gauge
- `marconi_grading_jobs_total{phase,result}` counter
- `marconi_grading_retries_total{phase}` counter
- `marconi_jobe_errors_total{phase,context}` counter
- `marconi_grading_latency_seconds_sum{phase,result}` summary component
- `marconi_grading_latency_seconds_count{phase,result}` summary component

## Suggested Dashboard Panels (by phase)

- **Throughput by phase**
  - `sum by (phase) (rate(marconi_grading_jobs_total[5m]))`
- **Failure rate by phase**
  - `sum by (phase) (rate(marconi_grading_jobs_total{result="error"}[10m]))`
  - `/ clamp_min(sum by (phase) (rate(marconi_grading_jobs_total[10m])), 0.001)`
- **P95-style latency trend proxy**
  - `sum by (phase) (rate(marconi_grading_latency_seconds_sum[5m]))`
  - `/ clamp_min(`
  - `sum by (phase) (rate(marconi_grading_latency_seconds_count[5m]))`
  - `,0.001)`
- **Retries by phase**
  - `sum by (phase) (increase(marconi_grading_retries_total[15m]))`
- **Pending queue depth**
  - `marconi_grading_queue_depth{status="pending"}`

## Alerts

- Rule file: `ops/monitoring/alerts/grading-alerts.yml`
- Includes:
  - high grading failure rate
  - high pending queue backlog
