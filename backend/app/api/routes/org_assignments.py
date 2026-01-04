from fastapi import APIRouter, Depends

from app.api.deps.auth import get_current_user
from app.api.deps.permissions import require_org_admin

router = APIRouter(
    prefix="/orgs/{org_id}/assignments",
    dependencies=[Depends(get_current_user), Depends(require_org_admin)],
)

