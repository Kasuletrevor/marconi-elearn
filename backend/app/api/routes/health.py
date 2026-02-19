from fastapi import APIRouter
from fastapi import Depends, Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.db.deps import get_db
from app.observability.grading_metrics import metrics_content_type, render_grading_metrics

router = APIRouter()


@router.get("/health")
def health() -> dict:
    return {"status": "ok"}


@router.get("/metrics", include_in_schema=False)
async def metrics(
    db: AsyncSession = Depends(get_db),
) -> Response:
    return Response(
        content=await render_grading_metrics(db),
        media_type=metrics_content_type(),
    )
