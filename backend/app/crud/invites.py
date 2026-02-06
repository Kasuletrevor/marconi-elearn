import csv
import hashlib
import io
import secrets
from dataclasses import dataclass
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.invite_token import InviteToken
from app.models.user import User
from app.models.student_profile import StudentProfile
from app.models.course_membership import CourseRole
from app.crud.course_memberships import add_course_membership, CourseMembershipExistsError


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


@dataclass(frozen=True)
class InviteIssue:
    email: str
    reason: str
    row_number: int | None = None
    full_name: str | None = None
    student_number: str | None = None
    programme: str | None = None


@dataclass(frozen=True)
class RosterRow:
    email: str
    full_name: str
    student_number: str
    programme: str
    row_number: int | None = None


async def create_course_student_invites(
    db: AsyncSession,
    *,
    organization_id: int,
    course_id: int,
    rows: list[RosterRow],
    expires_in_days: int = 7,
) -> tuple[list[str], int, list[InviteIssue]]:
    invites: list[str] = []
    issues: list[InviteIssue] = []
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
    auto_enrolled = 0

    seen_student_numbers: set[str] = set()

    for row in rows:
        full_name = row.full_name.strip()
        student_number = row.student_number.strip()
        programme = row.programme.strip()
        email = row.email.strip().lower()
        original_email = row.email.strip()

        def make_issue(reason: str, *, issue_email: str | None = None) -> InviteIssue:
            return InviteIssue(
                email=issue_email if issue_email is not None else email,
                reason=reason,
                row_number=row.row_number,
                full_name=full_name or None,
                student_number=student_number or None,
                programme=programme or None,
            )

        if not email or "@" not in email:
            issues.append(make_issue("invalid_email", issue_email=original_email))
            continue
        if not full_name:
            issues.append(make_issue("missing_name"))
            continue
        if not student_number:
            issues.append(make_issue("missing_student_number"))
            continue
        if not programme:
            issues.append(make_issue("missing_programme"))
            continue
        if student_number in seen_student_numbers:
            issues.append(make_issue("duplicate_student_number_in_csv"))
            continue
        seen_student_numbers.add(student_number)

        existing_user = await db.execute(select(User).where(User.email == email))
        user = existing_user.scalars().first()
        if user is None:
            user = User(email=email, password_hash=None)
            db.add(user)
            await db.flush()

        profile = await db.get(StudentProfile, user.id)
        if profile is None:
            profile = StudentProfile(user_id=user.id, full_name=full_name, programme=programme)
            db.add(profile)
        else:
            profile.full_name = full_name
            profile.programme = programme

        # If the user has already activated (has a password), enroll immediately and skip invite creation.
        if user.password_hash is not None:
            try:
                membership = await add_course_membership(
                    db, course_id=course_id, user_id=user.id, role=CourseRole.student
                )
            except CourseMembershipExistsError:
                membership = None

            if membership is not None:
                membership.student_number = student_number
                try:
                    await db.commit()
                except IntegrityError:
                    await db.rollback()
                    issues.append(make_issue("student_number_taken_in_course"))
                    continue
                auto_enrolled += 1
            continue

        token = secrets.token_urlsafe(32)
        invite = InviteToken(
            organization_id=organization_id,
            course_id=course_id,
            email=email,
            full_name=full_name,
            student_number=student_number,
            programme=programme,
            token_hash=_hash_token(token),
            expires_at=expires_at,
            used_at=None,
        )
        db.add(invite)
        invites.append(token)

    await db.commit()
    # Return tokens for non-activated users; activated users are auto-enrolled.
    return invites, auto_enrolled, issues


def parse_roster_from_csv_bytes(data: bytes) -> list[RosterRow]:
    text = data.decode("utf-8-sig", errors="replace")
    reader = csv.DictReader(io.StringIO(text))
    if reader.fieldnames is None:
        raise ValueError("missing_header")

    header_lookup = {
        name.strip().lower(): name
        for name in reader.fieldnames
        if name is not None
    }
    normalized = set(header_lookup.keys())
    required = {"email", "name", "student_number", "programme"}
    if not required.issubset(normalized):
        raise ValueError("missing_required_headers")

    email_key = header_lookup["email"]
    name_key = header_lookup["name"]
    student_number_key = header_lookup["student_number"]
    programme_key = header_lookup["programme"]

    rows: list[RosterRow] = []
    for row_number, raw in enumerate(reader, start=2):
        email = (raw.get(email_key) or "").strip()
        name = (raw.get(name_key) or "").strip()
        student_number = (raw.get(student_number_key) or "").strip()
        programme = (raw.get(programme_key) or "").strip()
        if not any([email, name, student_number, programme]):
            continue
        rows.append(
            RosterRow(
                email=email,
                full_name=name,
                student_number=student_number,
                programme=programme,
                row_number=row_number,
            )
        )
    return rows


async def get_invite_by_token(db: AsyncSession, *, token: str) -> InviteToken | None:
    token_hash = _hash_token(token)
    result = await db.execute(select(InviteToken).where(InviteToken.token_hash == token_hash))
    return result.scalars().first()


async def mark_invite_used(db: AsyncSession, *, invite: InviteToken) -> None:   
    invite.used_at = datetime.now(timezone.utc)
    await db.commit()


async def create_org_member_invite(
    db: AsyncSession,
    *,
    organization_id: int,
    email: str,
    expires_in_days: int = 7,
) -> str:
    token = secrets.token_urlsafe(32)
    expires_at = datetime.now(timezone.utc) + timedelta(days=expires_in_days)
    invite = InviteToken(
        organization_id=organization_id,
        course_id=None,
        email=email.strip().lower(),
        full_name=None,
        student_number=None,
        programme=None,
        token_hash=_hash_token(token),
        expires_at=expires_at,
        used_at=None,
    )
    db.add(invite)
    await db.commit()
    return token
