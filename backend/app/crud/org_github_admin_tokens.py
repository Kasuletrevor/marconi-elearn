from __future__ import annotations

from datetime import datetime, timezone

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.crypto import encrypt_token
from app.models.org_github_admin_token import OrgGitHubAdminToken


async def upsert_org_github_admin_token(
    db: AsyncSession,
    *,
    organization_id: int,
    user_id: int,
    github_user_id: int,
    github_login: str,
    access_token: str,
    refresh_token: str,
    token_expires_at: datetime,
    refresh_token_expires_at: datetime | None,
) -> OrgGitHubAdminToken:
    result = await db.execute(
        select(OrgGitHubAdminToken).where(
            OrgGitHubAdminToken.organization_id == organization_id,
            OrgGitHubAdminToken.user_id == user_id,
        )
    )
    row = result.scalars().first()
    if row is None:
        row = OrgGitHubAdminToken(
            organization_id=organization_id,
            user_id=user_id,
            github_user_id=github_user_id,
            github_login=github_login,
            access_token_enc=encrypt_token(access_token),
            refresh_token_enc=encrypt_token(refresh_token),
            token_expires_at=token_expires_at,
            refresh_token_expires_at=refresh_token_expires_at,
            last_verified_at=datetime.now(timezone.utc),
            revoked_at=None,
        )
        db.add(row)
    else:
        row.github_user_id = github_user_id
        row.github_login = github_login
        row.access_token_enc = encrypt_token(access_token)
        row.refresh_token_enc = encrypt_token(refresh_token)
        row.token_expires_at = token_expires_at
        row.refresh_token_expires_at = refresh_token_expires_at
        row.last_verified_at = datetime.now(timezone.utc)
        row.revoked_at = None

    await db.commit()
    await db.refresh(row)
    return row


async def list_org_github_admin_tokens(
    db: AsyncSession,
    *,
    organization_id: int,
) -> list[OrgGitHubAdminToken]:
    result = await db.execute(
        select(OrgGitHubAdminToken)
        .where(OrgGitHubAdminToken.organization_id == organization_id)
        .order_by(OrgGitHubAdminToken.last_verified_at.desc().nullslast(), OrgGitHubAdminToken.id.desc())
    )
    return list(result.scalars().all())


async def get_best_org_github_admin_token(
    db: AsyncSession,
    *,
    organization_id: int,
) -> OrgGitHubAdminToken | None:
    result = await db.execute(
        select(OrgGitHubAdminToken)
        .where(
            OrgGitHubAdminToken.organization_id == organization_id,
            OrgGitHubAdminToken.revoked_at.is_(None),
        )
        .order_by(OrgGitHubAdminToken.last_verified_at.desc().nullslast(), OrgGitHubAdminToken.id.desc())
        .limit(1)
    )
    return result.scalars().first()


async def revoke_org_github_admin_token(
    db: AsyncSession,
    *,
    organization_id: int,
    user_id: int,
) -> bool:
    result = await db.execute(
        select(OrgGitHubAdminToken).where(
            OrgGitHubAdminToken.organization_id == organization_id,
            OrgGitHubAdminToken.user_id == user_id,
        )
    )
    row = result.scalars().first()
    if row is None:
        return False
    row.revoked_at = datetime.now(timezone.utc)
    await db.commit()
    return True

