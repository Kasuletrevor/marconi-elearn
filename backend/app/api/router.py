from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.org_course_assignments import router as org_course_assignments_router
from app.api.routes.org_course_memberships import router as org_course_memberships_router
from app.api.routes.org_course_modules import router as org_course_modules_router
from app.api.routes.org_course_submissions import router as org_course_submissions_router
from app.api.routes.org_courses import router as org_courses_router
from app.api.routes.org_memberships import router as org_memberships_router
from app.api.routes.orgs import router as orgs_router
from app.api.routes.student import router as student_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(orgs_router, tags=["orgs"])
api_router.include_router(users_router, tags=["users"])
api_router.include_router(org_memberships_router, tags=["org-memberships"])
api_router.include_router(org_courses_router, tags=["courses"])
api_router.include_router(org_course_modules_router, tags=["modules"])
api_router.include_router(org_course_assignments_router, tags=["assignments"])
api_router.include_router(org_course_submissions_router, tags=["submissions"])
api_router.include_router(org_course_memberships_router, tags=["course-memberships"])
api_router.include_router(student_router, tags=["student"])
