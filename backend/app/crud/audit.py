from __future__ import annotations

import asyncio
import logging
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.session import SessionLocal
from app.models.audit_event import AuditEvent
from app.models.user import User

logger = logging.getLogger(__name__)
_audit_tasks: set[asyncio.Task[None]] = set()
_audit_dispatch_enabled = True


async def create_audit_event(
    db: AsyncSession,
    *,
    organization_id: int | None,
    actor_user_id: int | None,
    action: str,
    target_type: str | None = None,
    target_id: int | None = None,
    metadata: dict | None = None,
) -> AuditEvent:
    event = AuditEvent(
        organization_id=organization_id,
        actor_user_id=actor_user_id,
        action=action,
        target_type=target_type,
        target_id=target_id,
        meta=metadata,
    )
    db.add(event)
    await db.commit()
    await db.refresh(event)
    return event


async def _write_audit_event_async(
    *,
    organization_id: int | None,
    actor_user_id: int | None,
    action: str,
    target_type: str | None,
    target_id: int | None,
    metadata: dict[str, Any] | None,
    context: dict[str, Any] | None,
) -> None:
    try:
        async with SessionLocal() as db:
            await create_audit_event(
                db,
                organization_id=organization_id,
                actor_user_id=actor_user_id,
                action=action,
                target_type=target_type,
                target_id=target_id,
                metadata=metadata,
            )
    except Exception:
        logger.exception(
            "Failed to write audit event action=%s organization_id=%s actor_user_id=%s target_type=%s target_id=%s context=%s",
            action,
            organization_id,
            actor_user_id,
            target_type,
            target_id,
            context,
        )


def enqueue_audit_event(
    *,
    organization_id: int | None,
    actor_user_id: int | None,
    action: str,
    target_type: str | None = None,
    target_id: int | None = None,
    metadata: dict[str, Any] | None = None,
    context: dict[str, Any] | None = None,
) -> None:
    if not _audit_dispatch_enabled:
        return

    try:
        loop = asyncio.get_running_loop()
    except RuntimeError:
        logger.error(
            "Dropped audit event because no running event loop action=%s organization_id=%s actor_user_id=%s",
            action,
            organization_id,
            actor_user_id,
        )
        return

    task = loop.create_task(
        _write_audit_event_async(
            organization_id=organization_id,
            actor_user_id=actor_user_id,
            action=action,
            target_type=target_type,
            target_id=target_id,
            metadata=None if metadata is None else dict(metadata),
            context=None if context is None else dict(context),
        )
    )
    _audit_tasks.add(task)
    task.add_done_callback(_audit_tasks.discard)


async def drain_audit_tasks(*, timeout_seconds: float = 2.0) -> None:
    if not _audit_tasks:
        return
    pending = tuple(_audit_tasks)
    try:
        await asyncio.wait_for(
            asyncio.gather(*pending, return_exceptions=True),
            timeout=timeout_seconds,
        )
    except TimeoutError:
        logger.warning("Timed out waiting for %s audit task(s) to finish", len(_audit_tasks))


def set_audit_dispatch_enabled(enabled: bool) -> None:
    global _audit_dispatch_enabled
    _audit_dispatch_enabled = enabled


async def list_audit_events(
    db: AsyncSession,
    *,
    organization_id: int,
    offset: int = 0,
    limit: int = 100,
) -> list[tuple[AuditEvent, str | None]]:
    offset = max(0, offset)
    limit = min(max(1, limit), 200)
    stmt = (
        select(AuditEvent, User.email)
        .outerjoin(User, User.id == AuditEvent.actor_user_id)
        .where(AuditEvent.organization_id == organization_id)
        .order_by(AuditEvent.id.desc())
        .offset(offset)
        .limit(limit)
    )
    result = await db.execute(stmt)
    return list(result.all())
