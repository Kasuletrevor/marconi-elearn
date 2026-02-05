import secrets

from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course

UNSET: object = object()

_SELF_ENROLL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"


def _make_self_enroll_code(length: int = 8) -> str:
    return "".join(secrets.choice(_SELF_ENROLL_ALPHABET) for _ in range(length))


async def generate_unique_self_enroll_code(db: AsyncSession) -> str:
    # NOTE: Uniqueness is ultimately enforced by DB constraint; this function
    # only generates candidate codes.
    _ = db  # reserved for future pre-checks
    return _make_self_enroll_code()


async def create_course(
    db: AsyncSession,
    *,
    organization_id: int,
    code: str,
    title: str,
    description: str | None,
    semester: str | None = None,
    year: int | None = None,
    late_policy: dict | None = None,
) -> Course:
    course = Course(
        organization_id=organization_id,
        code=code.strip(),
        title=title.strip(),
        description=description.strip() if description else None,
        semester=semester.strip() if semester else None,
        year=year,
        late_policy=late_policy,
    )
    db.add(course)
    await db.commit()
    await db.refresh(course)
    return course


async def list_courses(
    db: AsyncSession,
    *,
    organization_id: int | None,
    offset: int = 0,
    limit: int = 100,
) -> list[Course]:
    offset = max(0, offset)
    limit = min(max(1, limit), 500)

    stmt = select(Course).order_by(Course.id)
    if organization_id is not None:
        stmt = stmt.where(Course.organization_id == organization_id)
    result = await db.execute(stmt.offset(offset).limit(limit))
    return list(result.scalars().all())


async def get_course(db: AsyncSession, *, course_id: int) -> Course | None:
    return await db.get(Course, course_id)


async def update_course(
    db: AsyncSession,
    *,
    course: Course,
    code: str | None | object = UNSET,
    title: str | None | object = UNSET,
    description: str | None | object = UNSET,
    semester: str | None | object = UNSET,
    year: int | None | object = UNSET,
    late_policy: dict | None | object = UNSET,
    self_enroll_enabled: bool | object = UNSET,
    self_enroll_code: str | None | object = UNSET,
    github_classroom_id: int | None | object = UNSET,
    github_classroom_name: str | None | object = UNSET,
) -> Course:
    if code is not UNSET:
        if code is not None:
            course.code = str(code).strip()
    if title is not UNSET:
        if title is not None:
            course.title = str(title).strip()
    if description is not UNSET:
        course.description = None if description is None else (str(description).strip() or None)
    if semester is not UNSET:
        course.semester = None if semester is None else (str(semester).strip() or None)
    if year is not UNSET:
        course.year = None if year is None else int(year)
    if late_policy is not UNSET:
        course.late_policy = late_policy
    if self_enroll_enabled is not UNSET:
        course.self_enroll_enabled = bool(self_enroll_enabled)
    if self_enroll_code is not UNSET:
        course.self_enroll_code = self_enroll_code
    if github_classroom_id is not UNSET:
        course.github_classroom_id = None if github_classroom_id is None else int(github_classroom_id)
    if github_classroom_name is not UNSET:
        course.github_classroom_name = (
            None if github_classroom_name is None else (str(github_classroom_name).strip() or None)
        )
    await db.commit()
    await db.refresh(course)
    return course


async def set_course_self_enroll(
    db: AsyncSession,
    *,
    course: Course,
    enabled: bool | None = None,
    regenerate_code: bool = False,
) -> Course:
    if enabled is not None:
        course.self_enroll_enabled = enabled

    if regenerate_code or (course.self_enroll_enabled and not course.self_enroll_code):
        for _ in range(25):
            course.self_enroll_code = await generate_unique_self_enroll_code(db)
            try:
                await db.commit()
                await db.refresh(course)
                return course
            except IntegrityError:
                await db.rollback()
                continue
        raise RuntimeError("Failed to generate unique self-enroll code")

    await db.commit()
    await db.refresh(course)
    return course


async def delete_course(db: AsyncSession, *, course: Course) -> None:
    await db.delete(course)
    await db.commit()
