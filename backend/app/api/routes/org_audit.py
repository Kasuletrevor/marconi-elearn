from __future__ import annotations

from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin
from app.crud.audit import list_audit_events
from app.db.deps import get_db
from app.models.user import User
from app.schemas.audit import AuditEventOut

router = APIRouter(prefix="/orgs/{org_id}/audit")


@router.get("", response_model=list[AuditEventOut], dependencies=[Depends(get_current_user), Depends(require_org_admin)])
async def list_org_audit_events(
    org_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    offset: int = 0,
    limit: int = 100,
) -> list[AuditEventOut]:
    rows = await list_audit_events(db, organization_id=org_id, offset=offset, limit=limit)
    return [
        AuditEventOut(
            id=e.id,
            organization_id=e.organization_id,
            actor_user_id=e.actor_user_id,
            actor_email=actor_email,
            action=e.action,
            target_type=e.target_type,
            target_id=e.target_id,
            metadata=e.meta,
            created_at=e.created_at,
        )
        for e, actor_email in rows
    ]
