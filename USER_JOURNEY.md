# Marconi Elearn - User Journeys (Current System)

This document explains how the system is navigated today, which dashboards exist, what each role can do, and which backend endpoints each page calls.

If anything here disagrees with `spec.md`, treat this file as "what the repo does right now" and `spec.md` as "what we intend to do next".

## Roles (What They Mean)

### Superadmin (platform-wide)
- Source of truth: config-based, via env (see backend settings).
- Can: view platform metrics, list all orgs, create orgs.
- Cannot (by default): manage an org unless they are also an org admin for that org, or they use superadmin-only views that list all orgs.

### Org admin (organization-wide)
- Has `OrgRole.admin` in `organization_memberships`.
- Can: manage org members, create/edit courses in the org, assign course staff roles, import student rosters/invites.

### Course staff (course-wide)
- Has a staff course role in `course_memberships`: `owner`, `co_lecturer`, or `ta`.
- Can: manage modules/resources/assignments for their courses, review and grade submissions.

### Student (course-wide, read-only + submissions)
- Has `CourseRole.student` in `course_memberships`.
- Can: view course content, submit assignment files, view own submission history and feedback.

## Primary Dashboard Redirect (and Student View)

Redirect logic is implemented in `frontend/src/lib/store.ts`:
- If `is_superadmin`: go to `/superadmin`
- Else if `org_admin_of.length > 0`: go to `/admin`
- Else if `org_roles` contains `lecturer` or `ta`: go to `/staff`
- Else if any `course_roles` is `owner|co_lecturer|ta`: go to `/staff`
- Else: go to `/dashboard`

"Student View" is an explicit override (a UI toggle stored in zustand) that intentionally sends you to `/dashboard` even if you have staff/admin roles.

## Frontend Pages (Routes)

Public:
- `/` - landing
- `/login` - email/password login
- `/invite/[token]` - invite preview + set password

Superadmin:
- `/superadmin` - platform overview (metrics)
- `/superadmin/organizations` - list/create orgs
- `/superadmin/settings` - placeholder settings

Org admin:
- `/admin` - org overview (your orgs, counts, links to staff pages)
- `/admin/members` - manage org memberships
- `/admin/courses` - create/edit org courses, assign course staff roles
- `/admin/audit` - activity log (audit events)
- `/admin/settings` - placeholder settings

Course staff:
- `/staff` - staff dashboard (courses you teach)
- `/staff/courses/[id]` - course management (tabs: overview, submissions, roster, assignments, modules)
- `/staff/courses/[id]/assignments/[assignmentId]` - assignment test case builder (configure autograding)
- `/staff/submissions` - submissions queue (filters + pagination + next-ungraded)
- `/staff/submissions/[id]` - submission detail (autograde results + manual override + regrade)

Student:
- `/dashboard` - student dashboard (courses + upcoming assignments)
- `/dashboard/courses/[id]` - course detail (modules + published resources + assignments)
- `/dashboard/courses/[id]/assignments/[assignmentId]` - assignment detail + submission history + upload
- `/dashboard/submissions` - global submission history (download + deep links)

## Backend API Overview (Prefix)

All API routes are under: `/api/v1` (see `backend/app/main.py`).

Auth uses HTTP-only cookie sessions. All frontend `fetch()` calls include `credentials: "include"`.

Audit events:
- `GET /api/v1/orgs/{org_id}/audit` (org admin or superadmin)

## Common Flows and Their API Calls

### 1) Login (all roles)

Page:
- `GET /login`

User fields:
- `email`
- `password`

API calls:
- `POST /api/v1/auth/login` (JSON `{ email, password }`)
- `GET /api/v1/auth/me` (to hydrate roles; many layouts do this on mount)

Outcome:
- Sets session cookie.
- Frontend redirects using the "Primary Dashboard Redirect" rules above.

### 2) Invite accept (new users: org members or course students)

Page:
- `GET /invite/[token]`

User fields:
- `password`
- `confirmPassword`

API calls:
- `GET /api/v1/invites/preview?token=...` (public)
- `POST /api/v1/auth/invite/accept` (JSON `{ token, password }`)

Notes:
- Invite preview returns `organization_name`, and may include `course_*` fields when the invite is a course invite.
- Accepting an invite sets the password for a pre-created "pending" user. It also auto-enrolls a student into a course if the invite includes `course_id`.
- After accept, frontend redirects using `getRedirectPath(user)`.

### 3) "Why did I not get an invite link?"

When adding org members via email:
- If the user already has a password set, the backend will NOT generate a new invite link.
- The UI shows: "No invite link was generated. Ask them to log in."

This is intentional: invites are for onboarding (first-time password set), not for login recovery. Password reset is not implemented yet.

## Role-Based User Journeys (Step-by-Step)

## Superadmin Journey (Platform Ops)

Goal: create an organization, then hand it off to an org admin.

1) Sign in
- Route: `/login`
- Fields: email, password
- API: `POST /api/v1/auth/login`

2) View platform overview and metrics
- Route: `/superadmin`
- API: `GET /api/v1/superadmin/stats`

3) Create an organization
- Route: `/superadmin/organizations`
- Fields: `organization name`
- Optional fields (UI): `initial org admin email`
- API:
  - `GET /api/v1/superadmin/organizations` (list)
  - `POST /api/v1/orgs` (create org; superadmin-only)
  - If initial admin email provided:
    - `POST /api/v1/orgs/{org_id}/memberships/by-email` (role = `admin`)
    - Response may include `invite_link` (only for new/pending users)

4) Next steps (navigation)
- Go to `/admin/members?org={org_id}` to add lecturers/TAs/admins.
- Go to `/admin/courses?org={org_id}` to create courses and assign staff.

## Org Admin Journey (Organization Setup)

Goal: add staff, create courses, assign course staff, enroll students.

1) Sign in
- Route: `/login`
- API: `POST /api/v1/auth/login`
- Redirect: `/admin` if `org_admin_of.length > 0`

2) Overview (sanity check)
- Route: `/admin`
- API:
  - `GET /api/v1/orgs` (lists orgs where you are org admin)
  - `GET /api/v1/orgs/{org_id}/courses` (per org, to render courses)
  - `GET /api/v1/orgs/{org_id}/courses/{course_id}/memberships` (per course, to compute counts)

3) Add org staff (creates accounts if needed)
- Route: `/admin/members`
- Fields:
  - `email`
  - `role` (admin | lecturer | ta)
- API:
  - `GET /api/v1/orgs` (or `GET /api/v1/superadmin/organizations` if you are superadmin using this page)
  - `GET /api/v1/orgs/{org_id}/memberships`
  - `POST /api/v1/orgs/{org_id}/memberships/by-email`
  - `PATCH /api/v1/orgs/{org_id}/memberships/{membership_id}` (change role)
  - `DELETE /api/v1/orgs/{org_id}/memberships/{membership_id}` (remove)

Important:
- If `POST .../by-email` returns `invite_link`, send it to that email owner to set their password at `/invite/[token]`.

4) Create courses (in the org)
- Route: `/admin/courses`
- Fields:
  - `code` (e.g. CS101)
  - `title`
  - `semester` (free text currently)
  - `year` (number)
  - `description` (optional)
- API:
  - `GET /api/v1/orgs/{org_id}/courses`
  - `POST /api/v1/orgs/{org_id}/courses`
  - `PATCH /api/v1/orgs/{org_id}/courses/{course_id}`
  - `DELETE /api/v1/orgs/{org_id}/courses/{course_id}`

Behavior:
- Creating a course automatically assigns the creator as `owner` for that course.

5) Assign course staff roles (owner/co-lecturer/TA)
- Route: `/admin/courses` (expand a course -> "Staff roles")
- Fields:
  - `email` (must already exist as a user)
  - `role` (owner | co_lecturer | ta)
- API:
  - `GET /api/v1/orgs/{org_id}/users/lookup?email=...`
  - `POST /api/v1/orgs/{org_id}/courses/{course_id}/memberships` (role = staff role)
  - `PATCH /api/v1/orgs/{org_id}/courses/{course_id}/memberships/{membership_id}`
  - `DELETE /api/v1/orgs/{org_id}/courses/{course_id}/memberships/{membership_id}`

Gotcha (common confusion):
- If lookup returns 404, that email does not exist in `users` yet.
- Fix: go to `/admin/members` and add them by email first (this creates a pending user).

6) Enroll students (CSV roster import + invites)

Where (current UI):
- Route: `/staff/courses/[id]` -> "Roster" tab

Roster CSV columns (required for import):
- `email`
- `name`
- `student_number`
- `programme`

API:
- `POST /api/v1/orgs/{org_id}/courses/{course_id}/invites/import-csv` (multipart form file upload)
- Response includes:
  - `invite_links[]` (dev-only return for manual distribution)
  - `auto_enrolled` (students already active get enrolled without invites)

## Course Staff Journey (Teaching + Grading)

Goal: manage content and grade submissions for the courses you teach.

1) Sign in
- Route: `/login`
- Redirect: `/staff` if you have any org staff role or any course staff role.

2) Staff dashboard (your courses)
- Route: `/staff`
- API:
  - `GET /api/v1/student/courses` (then filtered client-side to staff courses based on `user.course_roles`)

3) Manage a course
- Route: `/staff/courses/[id]`
- API (varies by tab):
  - Read-only course context:
    - `GET /api/v1/student/courses/{course_id}`
    - `GET /api/v1/student/courses/{course_id}/modules`
    - `GET /api/v1/student/courses/{course_id}/assignments`
  - Roster (staff-only):
    - `GET /api/v1/staff/courses/{course_id}/memberships`
    - `POST /api/v1/staff/courses/{course_id}/memberships`
    - `DELETE /api/v1/staff/courses/{course_id}/memberships/{membership_id}`
  - Modules (staff-only):
    - `GET /api/v1/staff/courses/{course_id}/modules`
    - `POST /api/v1/staff/courses/{course_id}/modules`
    - `PATCH /api/v1/staff/courses/{course_id}/modules/{module_id}`
    - `DELETE /api/v1/staff/courses/{course_id}/modules/{module_id}`
  - Assignments (staff-only):
    - `GET /api/v1/staff/courses/{course_id}/assignments`
    - `POST /api/v1/staff/courses/{course_id}/assignments`
    - `PATCH /api/v1/staff/courses/{course_id}/assignments/{assignment_id}`     
    - `DELETE /api/v1/staff/courses/{course_id}/assignments/{assignment_id}`    
  - Per-student extensions (staff-only):
    - `GET /api/v1/staff/courses/{course_id}/assignments/{assignment_id}/extensions`
    - `GET /api/v1/staff/courses/{course_id}/assignments/{assignment_id}/extensions/{user_id}`
    - `PUT /api/v1/staff/courses/{course_id}/assignments/{assignment_id}/extensions/{user_id}`
    - `DELETE /api/v1/staff/courses/{course_id}/assignments/{assignment_id}/extensions/{user_id}`
  - Resources (staff-only):
    - `GET /api/v1/staff/courses/{course_id}/modules/{module_id}/resources`
    - `POST /api/v1/staff/courses/{course_id}/modules/{module_id}/resources/link`
    - `POST /api/v1/staff/courses/{course_id}/modules/{module_id}/resources/file` (multipart form, fields include `title`, `file`, `position`, `is_published`)
    - `PATCH /api/v1/staff/courses/{course_id}/modules/{module_id}/resources/{resource_id}`
    - `DELETE /api/v1/staff/courses/{course_id}/modules/{module_id}/resources/{resource_id}`
    - `GET /api/v1/staff/courses/{course_id}/modules/{module_id}/resources/{resource_id}/download`
  - Missing submissions (staff-only):
    - `GET /api/v1/staff/courses/{course_id}/missing-submissions`
    - `GET /api/v1/staff/courses/{course_id}/missing-submissions/{assignment_id}`

4) Grade submissions (queue + next ungraded)

Queue page:
- Route: `/staff/submissions`
- UI fields:
  - `course` filter
  - `status` filter
  - pagination (offset/limit)
  - "Next ungraded" action
- API:
  - `GET /api/v1/staff/courses` (course filter options)
  - `GET /api/v1/staff/submissions/page?course_id=...&status_filter=...&offset=...&limit=...`
  - `GET /api/v1/staff/submissions/next?course_id=...&status_filter=...`

Submission detail page:
- Route: `/staff/submissions/[id]`
- UI fields:
  - autograde results (per-test pass/fail + compile output)
  - manual override (score + feedback)
  - `score`
  - `feedback`
- API:
  - `GET /api/v1/staff/submissions/{submission_id}`
  - `PATCH /api/v1/staff/submissions/{submission_id}`
  - `GET /api/v1/staff/submissions/{submission_id}/download`
  - `GET /api/v1/staff/submissions/{submission_id}/tests`
  - `POST /api/v1/staff/submissions/{submission_id}/regrade`

## Student Journey (Learning + Submitting)

Goal: enroll via invite, access course content, submit assignments, track history.

1) Accept invite (first-time)
- Route: `/invite/[token]`
- API:
  - `GET /api/v1/invites/preview?token=...`
  - `POST /api/v1/auth/invite/accept`

2) Student dashboard
- Route: `/dashboard`
- API:
  - `GET /api/v1/student/courses`
  - For upcoming assignments:
    - `GET /api/v1/student/courses/{course_id}/assignments` (per course)

3) View course content
- Route: `/dashboard/courses/[id]`
- API:
  - `GET /api/v1/student/courses/{course_id}`
  - `GET /api/v1/student/courses/{course_id}/modules`
  - `GET /api/v1/student/courses/{course_id}/assignments`
  - Resources (lazy-loaded per module expand):
    - `GET /api/v1/student/courses/{course_id}/modules/{module_id}/resources`
    - File download:
      - `GET /api/v1/student/resources/{resource_id}/download`

4) Submit and track history for an assignment
- Route: `/dashboard/courses/[id]/assignments/[assignmentId]`
- UI fields:
  - file upload (allowed extensions: `.c`, `.cpp`, optional `.zip` when enabled on assignment)
  - submission history (attempts, score, late penalty, error kind)
  - autograder results (visible tests only; hidden tests never shown)
- API:
  - `GET /api/v1/student/courses/{course_id}/assignments`
  - `GET /api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions` (your submission history)
  - `POST /api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions` (multipart file upload)
  - `GET /api/v1/student/courses/{course_id}/assignments/{assignment_id}/submissions/{submission_id}/tests` (visible tests only)

5) Global submission history (across assignments)
- Route: `/dashboard/submissions`
- API:
  - `GET /api/v1/student/submissions?course_id=...&assignment_id=...&offset=...&limit=...`
  - `GET /api/v1/student/submissions/{submission_id}/download`

6) Notifications (submission graded, etc)
- Route: notification bell is embedded in layouts
- API:
  - `GET /api/v1/student/notifications?unread_only=...&offset=...&limit=...`
  - `POST /api/v1/student/notifications/{notification_id}/read`

## Deployment Notes (Known Gotchas)

- Cross-site cookies: on Vercel, if your API is on a different origin, cookies require `SameSite=None; Secure` and correct CORS `allow_origins` + `allow_credentials`.
- Frontend API base: the frontend client currently reads `NEXT_PUBLIC_API_URL` (not `NEXT_PUBLIC_API_BASE_URL`).
