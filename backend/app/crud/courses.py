from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.course import Course


async def create_course(
    db: AsyncSession,
    *,
    organization_id: int,
    code: str,
    title: str,
    description: str | None,
    semester: str | None = None,
    year: int | None = None,
) -> Course:
    course = Course(
        organization_id=organization_id,
        code=code.strip(),
        title=title.strip(),
        description=description.strip() if description else None,
        semester=semester.strip() if semester else None,
        year=year,
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
    code: str | None,
    title: str | None,
    description: str | None,
    semester: str | None,
    year: int | None,
) -> Course:
    if code is not None:
        course.code = code.strip()
    if title is not None:
        course.title = title.strip()
    if description is not None:
        course.description = description.strip() if description else None
    if semester is not None:
        course.semester = semester.strip() if semester else None
    if year is not None:
        course.year = year
    await db.commit()
    await db.refresh(course)
    return course


async def delete_course(db: AsyncSession, *, course: Course) -> None:
    await db.delete(course)
    await db.commit()
