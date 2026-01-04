from fastapi import APIRouter

from app.api.routes.courses import router as courses_router
from app.api.routes.health import router as health_router
from app.api.routes.org_memberships import router as org_memberships_router
from app.api.routes.orgs import router as orgs_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(orgs_router, tags=["orgs"])
api_router.include_router(users_router, tags=["users"])
api_router.include_router(org_memberships_router, tags=["org-memberships"])
api_router.include_router(courses_router, tags=["courses"])
