from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.core.security import hash_password, verify_password
from sqlalchemy.exc import IntegrityError

from app.crud.course_memberships import CourseMembershipExistsError, add_course_membership
from app.crud.invites import get_invite_by_token, mark_invite_used
from app.crud.sessions import create_session, delete_session, get_session_by_token
from app.crud.audit import create_audit_event
from app.crud.users import create_user, get_user_by_email
from app.db.deps import get_db
from app.models.user import User
from sqlalchemy import select

from app.models.course_membership import CourseMembership, CourseRole
from app.models.organization_membership import OrgRole, OrganizationMembership
from app.models.student_profile import StudentProfile
from app.api.deps.superadmin import is_superadmin
from app.schemas.auth import (
    AcceptInviteRequest,
    CourseRoleItem,
    LoginRequest,
    MeResponse,
    OrgRoleItem,
)

router = APIRouter(prefix="/auth")


async def _build_me_response(db: AsyncSession, *, user: User) -> MeResponse:
    is_sa = is_superadmin(user)

    org_result = await db.execute(
        select(OrganizationMembership.organization_id, OrganizationMembership.role).where(
            OrganizationMembership.user_id == user.id
        )
    )
    org_rows = list(org_result.all())
    org_admin_of = [org_id for org_id, role in org_rows if role == OrgRole.admin]
    org_roles = [OrgRoleItem(org_id=org_id, role=role) for org_id, role in org_rows]

    course_result = await db.execute(
        select(CourseMembership.course_id, CourseMembership.role).where(
            CourseMembership.user_id == user.id
        )
    )
    course_roles = [
        CourseRoleItem(course_id=course_id, role=role) for course_id, role in course_result.all()
    ]

    return MeResponse(
        id=user.id,
        email=user.email,
        is_superadmin=is_sa,
        org_admin_of=org_admin_of,
        org_roles=org_roles,
        course_roles=course_roles,
    )


@router.post("/login", response_model=MeResponse)
async def login(
    payload: LoginRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeResponse:
    user = await get_user_by_email(db, email=str(payload.email))
    if (
        user is None
        and settings.superadmin_password
        and str(payload.email).strip().lower()
        in {e.strip().lower() for e in settings.superadmin_emails.split(",") if e.strip()}
        and payload.password == settings.superadmin_password
    ):
        user = await create_user(db, email=str(payload.email), password=payload.password)
    if (
        user is None
        or user.password_hash is None
        or not verify_password(payload.password, user.password_hash)
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid credentials")

    token, _ = await create_session(db, user_id=user.id)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
    )
    return await _build_me_response(db, user=user)


@router.get("/me", response_model=MeResponse)
async def me(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeResponse:
    return await _build_me_response(db, user=current_user)


@router.post("/logout", status_code=status.HTTP_204_NO_CONTENT)
async def logout(
    request: Request,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> None:
    token = request.cookies.get(settings.session_cookie_name)
    if token:
        existing = await get_session_by_token(db, token=token)
        if existing is not None:
            await delete_session(db, session=existing)
    response.delete_cookie(key=settings.session_cookie_name, path="/")
    return None


@router.post("/invite/accept", response_model=MeResponse)
async def accept_invite(
    payload: AcceptInviteRequest,
    response: Response,
    db: Annotated[AsyncSession, Depends(get_db)],
) -> MeResponse:
    invite = await get_invite_by_token(db, token=payload.token)
    if invite is None or invite.used_at is not None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid invite")
    from datetime import datetime, timezone

    if invite.expires_at <= datetime.now(timezone.utc):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite expired")

    user = await get_user_by_email(db, email=invite.email)
    if user is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invite user missing")

    user.password_hash = hash_password(payload.password)
    await db.commit()

    if invite.full_name and invite.programme:
        profile = await db.get(StudentProfile, user.id)
        if profile is None:
            profile = StudentProfile(
                user_id=user.id, full_name=invite.full_name, programme=invite.programme
            )
            db.add(profile)
        else:
            profile.full_name = invite.full_name
            profile.programme = invite.programme
        await db.commit()

    if invite.course_id is not None:
        try:
            membership = await add_course_membership(
                db, course_id=invite.course_id, user_id=user.id, role=CourseRole.student
            )
        except CourseMembershipExistsError:
            result = await db.execute(
                select(CourseMembership).where(
                    CourseMembership.course_id == invite.course_id,
                    CourseMembership.user_id == user.id,
                )
            )
            membership = result.scalars().first()

        if membership is not None and invite.student_number:
            membership.student_number = invite.student_number
            try:
                await db.commit()
            except IntegrityError as exc:
                await db.rollback()
                raise HTTPException(
                    status_code=status.HTTP_409_CONFLICT,
                    detail="Student number already used in this course",
                ) from exc

    await mark_invite_used(db, invite=invite)
    try:
        await create_audit_event(
            db,
            organization_id=invite.organization_id,
            actor_user_id=user.id,
            action="invite.accepted",
            target_type="user",
            target_id=user.id,
            metadata={"course_id": invite.course_id, "email": user.email},
        )
    except Exception:
        pass

    token, _ = await create_session(db, user_id=user.id)
    response.set_cookie(
        key=settings.session_cookie_name,
        value=token,
        httponly=True,
        secure=settings.session_cookie_secure,
        samesite=settings.session_cookie_samesite,
        path="/",
    )
    return await _build_me_response(db, user=user)
