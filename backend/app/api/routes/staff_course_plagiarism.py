"""Staff API routes for plagiarism detection (MOSS).

Endpoints:
- POST /staff/courses/{course_id}/assignments/{assignment_id}/plagiarism  (start run)
- GET  /staff/courses/{course_id}/assignments/{assignment_id}/plagiarism  (list runs)
- GET  /staff/courses/{course_id}/assignments/{assignment_id}/plagiarism/{run_id}  (run detail)
- GET  /staff/courses/{course_id}/assignments/{assignment_id}/plagiarism/{run_id}/pairs  (pairs)
"""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps.auth import get_current_user
from app.api.deps.course_permissions import require_course_staff
from app.core.config import settings
from app.crud.plagiarism import (
    create_plagiarism_run,
    get_plagiarism_run,
    list_plagiarism_pairs,
    list_plagiarism_runs,
    update_run_status,
)
from app.db.deps import get_db
from app.models.assignment import Assignment
from app.models.user import User
from app.schemas.plagiarism import (
    PlagiarismPairOut,
    PlagiarismRunOut,
    StartPlagiarismRunRequest,
)
from app.worker.plagiarism import enqueue_plagiarism_run

router = APIRouter(
    prefix="/staff/courses/{course_id}/assignments/{assignment_id}/plagiarism",
    dependencies=[Depends(get_current_user)],
)


async def _get_assignment_or_404(
    db: AsyncSession, course_id: int, assignment_id: int
) -> Assignment:
    assignment = await db.get(Assignment, assignment_id)
    if assignment is None or assignment.course_id != course_id:
        raise HTTPException(status_code=404, detail="Assignment not found")
    return assignment


@router.post("", response_model=PlagiarismRunOut, status_code=201)
async def start_plagiarism_run(
    course_id: int,
    assignment_id: int,
    body: StartPlagiarismRunRequest,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_course_staff),
    current_user: User = Depends(get_current_user),
) -> PlagiarismRunOut:
    """Start a new MOSS plagiarism check for an assignment."""
    if not settings.moss_user_id.strip():
        raise HTTPException(
            status_code=400,
            detail="MOSS is not configured. Set MOSS_USER_ID in the environment.",
        )

    await _get_assignment_or_404(db, course_id, assignment_id)

    run = await create_plagiarism_run(
        db,
        course_id=course_id,
        assignment_id=assignment_id,
        initiated_by_user_id=current_user.id,
    )

    queued = await enqueue_plagiarism_run(run_id=run.id, language=body.language)
    if not queued:
        await update_run_status(
            db,
            run=run,
            status="error",
            error_message="Plagiarism queue unavailable. Configure REDIS_URL and run Taskiq worker.",
        )
        raise HTTPException(
            status_code=503,
            detail="Plagiarism queue unavailable. Configure REDIS_URL and run Taskiq worker.",
        )

    return PlagiarismRunOut(
        id=run.id,
        course_id=run.course_id,
        assignment_id=run.assignment_id,
        initiated_by_user_id=run.initiated_by_user_id,
        status=run.status,
        moss_report_url=run.moss_report_url,
        error_message=run.error_message,
        pair_count=run.pair_count,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


@router.get("", response_model=list[PlagiarismRunOut])
async def list_runs(
    course_id: int,
    assignment_id: int,
    offset: int = 0,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_course_staff),
) -> list[PlagiarismRunOut]:
    """List plagiarism runs for an assignment."""
    await _get_assignment_or_404(db, course_id, assignment_id)
    runs = await list_plagiarism_runs(db, assignment_id=assignment_id, offset=offset, limit=limit)
    return [
        PlagiarismRunOut(
            id=r.id,
            course_id=r.course_id,
            assignment_id=r.assignment_id,
            initiated_by_user_id=r.initiated_by_user_id,
            status=r.status,
            moss_report_url=r.moss_report_url,
            error_message=r.error_message,
            pair_count=r.pair_count,
            created_at=r.created_at,
            completed_at=r.completed_at,
        )
        for r in runs
    ]


@router.get("/{run_id}", response_model=PlagiarismRunOut)
async def get_run(
    course_id: int,
    assignment_id: int,
    run_id: int,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_course_staff),
) -> PlagiarismRunOut:
    """Get a single plagiarism run."""
    run = await get_plagiarism_run(db, run_id=run_id)
    if run is None or run.assignment_id != assignment_id or run.course_id != course_id:
        raise HTTPException(status_code=404, detail="Plagiarism run not found")
    return PlagiarismRunOut(
        id=run.id,
        course_id=run.course_id,
        assignment_id=run.assignment_id,
        initiated_by_user_id=run.initiated_by_user_id,
        status=run.status,
        moss_report_url=run.moss_report_url,
        error_message=run.error_message,
        pair_count=run.pair_count,
        created_at=run.created_at,
        completed_at=run.completed_at,
    )


@router.get("/{run_id}/pairs", response_model=list[PlagiarismPairOut])
async def get_run_pairs(
    course_id: int,
    assignment_id: int,
    run_id: int,
    min_similarity: int = 0,
    offset: int = 0,
    limit: int = 200,
    db: AsyncSession = Depends(get_db),
    _staff=Depends(require_course_staff),
) -> list[PlagiarismPairOut]:
    """Get match pairs for a plagiarism run, sorted by similarity desc."""
    run = await get_plagiarism_run(db, run_id=run_id)
    if run is None or run.assignment_id != assignment_id or run.course_id != course_id:
        raise HTTPException(status_code=404, detail="Plagiarism run not found")

    pairs = await list_plagiarism_pairs(
        db, run_id=run_id, min_similarity=min_similarity, offset=offset, limit=limit
    )

    # Enrich with email addresses
    user_ids = set()
    for p in pairs:
        user_ids.add(p.student_a_user_id)
        user_ids.add(p.student_b_user_id)

    email_map: dict[int, str] = {}
    if user_ids:
        from app.models.user import User

        result = await db.execute(select(User.id, User.email).where(User.id.in_(user_ids)))
        for uid, email in result.all():
            email_map[uid] = email

    return [
        PlagiarismPairOut(
            id=p.id,
            run_id=p.run_id,
            student_a_user_id=p.student_a_user_id,
            student_a_email=email_map.get(p.student_a_user_id),
            student_b_user_id=p.student_b_user_id,
            student_b_email=email_map.get(p.student_b_user_id),
            similarity_pct=p.similarity_pct,
            lines_matched=p.lines_matched,
            moss_match_url=p.moss_match_url,
        )
        for p in pairs
    ]
