from __future__ import annotations

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.audit_event import AuditEvent
from app.models.user import User


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
