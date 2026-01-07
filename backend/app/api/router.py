from fastapi import APIRouter

from app.api.routes.auth import router as auth_router
from app.api.routes.health import router as health_router
from app.api.routes.invites import router as invites_router
from app.api.routes.org_course_assignments import router as org_course_assignments_router
from app.api.routes.org_course_invites import router as org_course_invites_router
from app.api.routes.org_course_memberships import router as org_course_memberships_router
from app.api.routes.org_course_modules import router as org_course_modules_router
from app.api.routes.org_course_submissions import router as org_course_submissions_router
from app.api.routes.org_courses import router as org_courses_router
from app.api.routes.org_memberships import router as org_memberships_router
from app.api.routes.org_users import router as org_users_router
from app.api.routes.orgs import router as orgs_router
from app.api.routes.staff_course_assignments import router as staff_course_assignments_router
from app.api.routes.staff_course_invites import router as staff_course_invites_router
from app.api.routes.staff_course_memberships import router as staff_course_memberships_router
from app.api.routes.staff_course_modules import router as staff_course_modules_router
from app.api.routes.staff_course_resources import router as staff_course_resources_router
from app.api.routes.staff_course_submissions import router as staff_course_submissions_router
from app.api.routes.staff_courses import router as staff_courses_router
from app.api.routes.staff_missing_submissions import router as staff_missing_submissions_router
from app.api.routes.staff_submissions import router as staff_submissions_router
from app.api.routes.student import router as student_router
from app.api.routes.student_notifications import router as student_notifications_router
from app.api.routes.student_resources import router as student_resources_router
from app.api.routes.superadmin_organizations import router as superadmin_organizations_router
from app.api.routes.users import router as users_router

api_router = APIRouter()
api_router.include_router(health_router, tags=["health"])
api_router.include_router(auth_router, tags=["auth"])
api_router.include_router(invites_router, tags=["invites-public"])
api_router.include_router(staff_courses_router, tags=["staff"])
api_router.include_router(staff_course_modules_router, tags=["staff"])
api_router.include_router(staff_course_assignments_router, tags=["staff"])
api_router.include_router(staff_course_submissions_router, tags=["staff"])
api_router.include_router(staff_course_memberships_router, tags=["staff"])
api_router.include_router(staff_course_invites_router, tags=["staff"])
api_router.include_router(staff_course_resources_router, tags=["staff"])
api_router.include_router(staff_missing_submissions_router, tags=["staff"])
api_router.include_router(staff_submissions_router, tags=["staff"])
api_router.include_router(superadmin_organizations_router, tags=["superadmin"])
api_router.include_router(orgs_router, tags=["orgs"])
api_router.include_router(users_router, tags=["users"])
api_router.include_router(org_memberships_router, tags=["org-memberships"])
api_router.include_router(org_users_router, tags=["org-users"])
api_router.include_router(org_courses_router, tags=["courses"])
api_router.include_router(org_course_modules_router, tags=["modules"])
api_router.include_router(org_course_assignments_router, tags=["assignments"])
api_router.include_router(org_course_submissions_router, tags=["submissions"])
api_router.include_router(org_course_memberships_router, tags=["course-memberships"])
api_router.include_router(org_course_invites_router, tags=["invites"])
api_router.include_router(student_router, tags=["student"])
api_router.include_router(student_resources_router, tags=["student"])
api_router.include_router(student_notifications_router, tags=["student"])
