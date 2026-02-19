from app.models.grading_event import GradingEvent
import pytest


async def _seed_metrics_events(db) -> None:
    db.add(
        GradingEvent(
            submission_id=None,
            phase="practice",
            event_type="graded",
            attempt=0,
            duration_ms=1500,
        )
    )
    db.add(
        GradingEvent(
            submission_id=None,
            phase="practice",
            event_type="error",
            attempt=1,
            reason="jobe_transient",
            context="run_test_case",
            duration_ms=700,
        )
    )
    db.add(
        GradingEvent(
            submission_id=None,
            phase="final",
            event_type="retry",
            attempt=0,
            reason="jobe_transient",
            context="prepare",
        )
    )
    await db.commit()


@pytest.mark.asyncio
async def test_metrics_endpoint_exposes_grading_counters(client, db):
    await _seed_metrics_events(db)

    response = await client.get("/api/v1/metrics")
    assert response.status_code == 200
    assert "text/plain" in response.headers["content-type"]

    body = response.text
    assert 'marconi_grading_jobs_total{phase="practice",result="graded"} 1' in body
    assert 'marconi_grading_jobs_total{phase="practice",result="error"} 1' in body
    assert 'marconi_grading_retries_total{phase="final"} 1' in body
    assert 'marconi_jobe_errors_total{context="run_test_case",phase="practice"} 1' in body
    assert 'marconi_grading_latency_seconds_count{phase="practice",result="graded"} 1' in body
    assert 'marconi_grading_queue_depth{status="pending"}' in body
