from __future__ import annotations

from datetime import datetime, timezone
from typing import Annotated, Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.core.crypto import TokenCryptoNotConfiguredError, decrypt_token
from app.crud.course_memberships import list_course_memberships
from app.crud.courses import get_course
from app.crud.org_github_admin_tokens import get_best_org_github_admin_token, upsert_org_github_admin_token
from app.crud.organizations import get_organization
from app.db.deps import get_db
from app.integrations.github import (
    GitHubIntegrationNotConfiguredError,
    get_viewer,
    list_accepted_assignments,
    list_classroom_assignments,
    list_classrooms,
    refresh_token as refresh_github_token,
)
from app.models.course_membership import CourseRole
from app.models.user import User
from app.schemas.course_github_sync import (
    GitHubClassroomAssignmentOut,
    GitHubClassroomOut,
    GitHubMissingLinkStudentOut,
    GitHubRosterSyncOut,
)

router = APIRouter(prefix="/staff/courses/{course_id}/github", tags=["staff"])


def _normalize_login(value: str | None) -> str | None:
    if value is None:
        return None
    normalized = value.strip().lower()
    return normalized or None


def _extract_login_from_accepted_assignment(item: dict[str, Any]) -> str | None:
    students = item.get("students")
    if isinstance(students, list):
        for student in students:
            if isinstance(student, dict):
                login = _normalize_login(student.get("login"))  # type: ignore[arg-type]
                if login:
                    return login
    return _normalize_login(item.get("github_username"))  # type: ignore[arg-type]


async def _get_org_access_token(
    db: AsyncSession,
    *,
    organization_id: int,
) -> str:
    token_row = await get_best_org_github_admin_token(db, organization_id=organization_id)
    if token_row is None:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="No connected GitHub admin token for this organization",
        )

    try:
        access_token = decrypt_token(token_row.access_token_enc)
        refresh_token = decrypt_token(token_row.refresh_token_enc)
    except TokenCryptoNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc

    if token_row.token_expires_at <= datetime.now(timezone.utc):
        token_set = await refresh_github_token(refresh_token=refresh_token)
        viewer = await get_viewer(access_token=token_set.access_token)
        await upsert_org_github_admin_token(
            db,
            organization_id=token_row.organization_id,
            user_id=token_row.user_id,
            github_user_id=int(viewer["id"]),
            github_login=str(viewer["login"]),
            access_token=token_set.access_token,
            refresh_token=token_set.refresh_token,
            token_expires_at=token_set.expires_at,
            refresh_token_expires_at=token_set.refresh_token_expires_at,
        )
        access_token = token_set.access_token

    return access_token


@router.get("/classrooms", response_model=list[GitHubClassroomOut])
async def list_course_github_classrooms(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
) -> list[GitHubClassroomOut]:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    org = await get_organization(db, org_id=course.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if not org.github_org_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization GitHub org login is not configured",
        )

    try:
        access_token = await _get_org_access_token(db, organization_id=org.id)
        classrooms = await list_classrooms(access_token=access_token)
    except GitHubIntegrationNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error: {exc.response.status_code}",
        ) from exc

    allowed_org = org.github_org_login.strip().lower()
    out: list[GitHubClassroomOut] = []
    for classroom in classrooms:
        classroom_org = classroom.get("organization")
        classroom_org_login = (
            str(classroom_org.get("login")).strip().lower()
            if isinstance(classroom_org, dict) and classroom_org.get("login") is not None
            else None
        )
        if classroom_org_login != allowed_org:
            continue
        out.append(
            GitHubClassroomOut(
                id=int(classroom["id"]),
                name=str(classroom.get("name") or f"Classroom #{classroom['id']}"),
                archived_at=(
                    str(classroom.get("archived_at"))
                    if classroom.get("archived_at") is not None
                    else None
                ),
            )
        )
    return out


@router.get("/roster-sync", response_model=GitHubRosterSyncOut)
async def get_course_github_roster_sync(
    course_id: int,
    db: Annotated[AsyncSession, Depends(get_db)],
    _current_user: Annotated[User, Depends(get_current_user)],
    _require_staff: Annotated[None, Depends(require_course_staff)],
    classroom_id: int | None = Query(default=None, ge=1),
    assignment_id: int | None = Query(default=None, ge=1),
) -> GitHubRosterSyncOut:
    course = await get_course(db, course_id=course_id)
    if course is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Course not found")

    org = await get_organization(db, org_id=course.organization_id)
    if org is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Organization not found")
    if not org.github_org_login:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Organization GitHub org login is not configured",
        )

    memberships = await list_course_memberships(db, course_id=course_id, offset=0, limit=500)
    student_memberships = [m for m in memberships if m.role == CourseRole.student]
    linked_logins_set = {
        login
        for login in (_normalize_login(m.github_login) for m in student_memberships)
        if login is not None
    }
    missing_github_students = [
        GitHubMissingLinkStudentOut(
            membership_id=m.id,
            user_id=m.user_id,
            user_email=m.user_email,
            student_number=m.student_number,
        )
        for m in student_memberships
        if _normalize_login(m.github_login) is None
    ]

    try:
        access_token = await _get_org_access_token(db, organization_id=org.id)
        classrooms_raw = await list_classrooms(access_token=access_token)
    except GitHubIntegrationNotConfiguredError as exc:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(exc)) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"GitHub API error: {exc.response.status_code}",
        ) from exc

    allowed_org = org.github_org_login.strip().lower()
    classrooms: list[GitHubClassroomOut] = []
    classrooms_by_id: dict[int, GitHubClassroomOut] = {}
    for classroom in classrooms_raw:
        classroom_org = classroom.get("organization")
        classroom_org_login = (
            str(classroom_org.get("login")).strip().lower()
            if isinstance(classroom_org, dict) and classroom_org.get("login") is not None
            else None
        )
        if classroom_org_login != allowed_org:
            continue
        classroom_out = GitHubClassroomOut(
            id=int(classroom["id"]),
            name=str(classroom.get("name") or f"Classroom #{classroom['id']}"),
            archived_at=(
                str(classroom.get("archived_at"))
                if classroom.get("archived_at") is not None
                else None
            ),
        )
        classrooms.append(classroom_out)
        classrooms_by_id[classroom_out.id] = classroom_out

    selected_classroom_id = classroom_id or course.github_classroom_id
    selected_assignment_id = assignment_id
    selected_classroom_name = course.github_classroom_name

    assignments: list[GitHubClassroomAssignmentOut] = []
    accepted_logins_set: set[str] = set()

    if selected_classroom_id is not None:
        if selected_classroom_id not in classrooms_by_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Selected classroom is not available for this organization",
            )
        selected_classroom_name = classrooms_by_id[selected_classroom_id].name

        try:
            assignments_raw = await list_classroom_assignments(
                access_token=access_token,
                classroom_id=selected_classroom_id,
            )
        except httpx.HTTPStatusError as exc:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail=f"GitHub API error: {exc.response.status_code}",
            ) from exc

        assignments = [
            GitHubClassroomAssignmentOut(
                id=int(item["id"]),
                title=str(item.get("title") or f"Assignment #{item['id']}"),
                invite_link=str(item.get("invite_link")) if item.get("invite_link") else None,
                deadline=str(item.get("deadline")) if item.get("deadline") else None,
            )
            for item in assignments_raw
        ]
        assignments_by_id = {item.id: item for item in assignments}

        if selected_assignment_id is not None:
            if selected_assignment_id not in assignments_by_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="Selected assignment is not in the selected classroom",
                )
            try:
                accepted_raw = await list_accepted_assignments(
                    access_token=access_token,
                    assignment_id=selected_assignment_id,
                )
            except httpx.HTTPStatusError as exc:
                raise HTTPException(
                    status_code=status.HTTP_502_BAD_GATEWAY,
                    detail=f"GitHub API error: {exc.response.status_code}",
                ) from exc
            accepted_logins_set = {
                login
                for login in (_extract_login_from_accepted_assignment(item) for item in accepted_raw)
                if login is not None
            }

    matched_logins = sorted(linked_logins_set & accepted_logins_set)
    missing_logins = sorted(linked_logins_set - accepted_logins_set)
    extra_logins = sorted(accepted_logins_set - linked_logins_set)

    return GitHubRosterSyncOut(
        course_id=course.id,
        bound_classroom_id=course.github_classroom_id,
        bound_classroom_name=course.github_classroom_name,
        selected_classroom_id=selected_classroom_id,
        selected_assignment_id=selected_assignment_id,
        classrooms=classrooms,
        assignments=assignments,
        linked_students_total=len(linked_logins_set),
        accepted_students_total=len(accepted_logins_set),
        matched_logins=matched_logins,
        missing_logins=missing_logins,
        extra_logins=extra_logins,
        missing_github_students=missing_github_students,
    )
