import asyncio
import logging

import pytest

from app.crud import audit as audit_crud


@pytest.mark.asyncio
async def test_audit_failure_is_non_blocking_and_logged(client, monkeypatch, caplog):
    async def _failing_create_audit_event(*args, **kwargs):
        raise RuntimeError("audit write failed")

    monkeypatch.setattr(audit_crud, "create_audit_event", _failing_create_audit_event)
    caplog.set_level(logging.ERROR, logger="app.crud.audit")

    login = await client.post(
        "/api/v1/auth/login",
        json={"email": "admin@example.com", "password": "password123"},
    )
    assert login.status_code == 200

    create_org = await client.post("/api/v1/orgs", json={"name": "Audit Failure Org"})
    assert create_org.status_code == 201

    for _ in range(30):
        if any("Failed to write audit event action=org.created" in rec.getMessage() for rec in caplog.records):
            break
        await asyncio.sleep(0.02)

    assert any("Failed to write audit event action=org.created" in rec.getMessage() for rec in caplog.records)
