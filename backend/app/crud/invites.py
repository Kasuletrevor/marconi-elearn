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


@dataclass(frozen=True)
class RosterRow:
    email: str
    full_name: str
    student_number: str
    programme: str


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
        email = row.email.strip().lower()
        if not email or "@" not in email:
            issues.append(InviteIssue(email=row.email, reason="invalid_email"))
            continue
        if not row.full_name.strip():
            issues.append(InviteIssue(email=email, reason="missing_name"))
            continue
        if not row.student_number.strip():
            issues.append(InviteIssue(email=email, reason="missing_student_number"))
            continue
        if not row.programme.strip():
            issues.append(InviteIssue(email=email, reason="missing_programme"))
            continue
        if row.student_number in seen_student_numbers:
            issues.append(InviteIssue(email=email, reason="duplicate_student_number_in_csv"))
            continue
        seen_student_numbers.add(row.student_number)

        existing_user = await db.execute(select(User).where(User.email == email))
        user = existing_user.scalars().first()
        if user is None:
            user = User(email=email, password_hash=None)
            db.add(user)
            await db.flush()

        profile = await db.get(StudentProfile, user.id)
        if profile is None:
            profile = StudentProfile(user_id=user.id, full_name=row.full_name.strip(), programme=row.programme.strip())
            db.add(profile)
        else:
            profile.full_name = row.full_name.strip()
            profile.programme = row.programme.strip()

        # If the user has already activated (has a password), enroll immediately and skip invite creation.
        if user.password_hash is not None:
            try:
                membership = await add_course_membership(
                    db, course_id=course_id, user_id=user.id, role=CourseRole.student
                )
            except CourseMembershipExistsError:
                membership = None

            if membership is not None:
                membership.student_number = row.student_number.strip()
                try:
                    await db.commit()
                except IntegrityError:
                    await db.rollback()
                    issues.append(InviteIssue(email=email, reason="student_number_taken_in_course"))
                    continue
                auto_enrolled += 1
            continue

        token = secrets.token_urlsafe(32)
        invite = InviteToken(
            organization_id=organization_id,
            course_id=course_id,
            email=email,
            full_name=row.full_name.strip(),
            student_number=row.student_number.strip(),
            programme=row.programme.strip(),
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

    normalized = {name.strip().lower() for name in reader.fieldnames if name is not None}
    required = {"email", "name", "student_number", "programme"}
    if not required.issubset(normalized):
        raise ValueError("missing_required_headers")

    rows: list[RosterRow] = []
    for raw in reader:
        email = (raw.get("email") or "").strip()
        name = (raw.get("name") or "").strip()
        student_number = (raw.get("student_number") or "").strip()
        programme = (raw.get("programme") or "").strip()
        if not any([email, name, student_number, programme]):
            continue
        rows.append(RosterRow(email=email, full_name=name, student_number=student_number, programme=programme))
    return rows


async def get_invite_by_token(db: AsyncSession, *, token: str) -> InviteToken | None:
    token_hash = _hash_token(token)
    result = await db.execute(select(InviteToken).where(InviteToken.token_hash == token_hash))
    return result.scalars().first()


async def mark_invite_used(db: AsyncSession, *, invite: InviteToken) -> None:
    invite.used_at = datetime.now(timezone.utc)
    await db.commit()
