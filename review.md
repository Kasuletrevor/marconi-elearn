  - Grading workflow upgrades: bulk actions (mark grading/graded), pagination, "next ungraded" navigation, per-course "missing submissions" list.
  - Auto-grading runner: compile/run C/C++ against hidden tests, store results/artifacts, timeouts, sandbox/JOBE integration.
  - Staff submissions UI: inline code viewer (zip browsing), rubric templates, comment threads, regrade button, download-all per assignment.
  - Roster + invites productionization: Gmail SMTP send, resend invites, invite status (sent/opened/accepted), CSV issues UI, rate-limit handling.
  - Course content/resources: module resources (PDF/links/files), permissions, ordering, visibility toggles.
  - Admin management: create/edit courses with semester/year, assign staff roles, manage org memberships in UI.
  - Student experience: "My submissions" global page, per-assignment history view polish, download their own submissions, notifications.
  - Audit & observability: activity log, basic metrics, error reporting, structured logs.
  - Security hardening: file download auth checks across edge cases, content-type safety, size limits, session rotation, CSRF posture (since cookies).
  - Data model completeness: assignment "published" state, late policy, multiple attempts policy, submission versioning.
  - Want "next ungraded" to mean "next after this submission" (instead of "next in the queue"): add an `after_submission_id` (or `after_created_at`) param to the backend and wire it into the detail page.
  - Testing without email: surface invite links in the roster UI for manual sharing (token is only returned at invite creation time).

## Code Review Summary (Jan 18, 2026)

### Backend Issues (13 categories)

| Priority | Issue | Location |
|----------|-------|----------|
| High | Silent exception swallowing (23+ places) | Multiple route files - audit events, notifications, grading silently fail |
| High | Session expiration (fixed) | `app/models/session.py` + `app/api/deps/auth.py` - sessions now expire and expired sessions are rejected |
| Medium | ZIP upload grading (fixed) | `app/worker/grading.py` + `app/worker/zip_extract.py` - ZIP submissions are extracted and graded (with safety checks) |
| Medium | Race condition in self-enroll code generation | `app/crud/courses.py:17-23` - uniqueness check not atomic |
| Medium | Superadmin bypass missing in course permissions | `app/api/deps/course_permissions.py` - no `is_superadmin` check |
| Medium | File uploaded to memory before size check | `app/api/routes/student.py:276-283` |
| Low | Login allows 1-char passwords | `app/schemas/auth.py:9` |
| Low | No year range validation on courses | `app/schemas/course.py` |
| Low | Missing audit event for org deletion | `app/api/routes/orgs.py:97-109` |
| Low | Hardcoded upload path | Multiple files - `var/uploads` path not configurable |
| Low | Missing composite DB indexes | `app/models/submission.py` - single-column only |

### Frontend Issues (14 categories)

| Priority | Issue | Count / Location |
|----------|-------|------------------|
| High | Placeholder/unimplemented pages | 7 instances (settings pages, superadmin dashboard features) |
| High | Hard-coded fake system status | `superadmin/page.tsx:38-44` - not from API |
| High | Non-functional buttons | "Access Global Ledger", "Export Transparency Report" |
| Medium | `console.log/error` statements | 15 total across codebase |
| Medium | Missing form validation | 5 forms lacking proper validation |
| Medium | Suppressed `useEffect` dependency warnings | 7 instances |
| Medium | Silent error handling | 6 places with `// ignore` comments |
| Medium | Duplicated `NotificationBell` component | Dashboard layout has copy when shared one exists |
| Low | Unused imports | 3 instances (Users, GraduationCap, setLoading) |
| Low | `any` type usage | 2 icon prop types |
| Low | `localStorage` persists after logout | `marconi:admin_org_id` keys |
| Low | `confirm()` instead of accessible modals | 2 delete confirmations |
| Low | Hard-coded programme options | `["BELE", "BSCE", "BBIO", "BSTE"]` in multiple places |

### Most Critical Items to Address

1. Session expiration - security bug; sessions live forever.
2. Silent exception swallowing - makes debugging impossible; audit trail incomplete.
3. ZIP file false promise - users can upload but grading always fails.
4. Placeholder pages - settings pages show "Coming soon" with no functionality.
5. Fake system status - superadmin dashboard shows hard-coded "operational" status.
6. `console.log` cleanup - debug statements left in production code.

## Frontend Cleanup (completed + remaining)

### Completed (Jan 13, 2026)

- Superadmin dashboard "Infrastructure Health" no longer hard-codes status: now uses `GET /api/v1/health` for API status and superadmin telemetry read for DB.
- "Access Global Ledger" + "Export Transparency Report" are explicitly disabled (no dead clicks / false promise).
- Settings pages improved:
  - Student settings shows account info + logout.
  - Admin settings supports renaming an org via `PATCH /api/v1/orgs/{id}` (with org selector).
  - Superadmin settings shows API base URL + live health check.
- Notifications:
  - Removed duplicate inline NotificationBell in dashboard layout; dashboard now uses the shared component.
  - NotificationBell surfaces an in-UI error message and avoids production `console.error`.
- Console/silent-catch cleanup:
  - Replaced production `console.*` usage with a dev-only `reportError(...)` helper.
  - Replaced several `// ignore` catch blocks (clipboard, deletes) with `reportError(...)` to keep debugging possible without spamming production logs.
- Logout cleanup: `marconi:admin_org_id` is now cleared on logout.
- Programme options centralized: `["BELE", "BSCE", "BBIO", "BSTE"]` now comes from a single shared module and is reused consistently.
- Frontend lint now has 0 errors (warnings remain).

### Remaining (still open)

- Accessibility: replace `confirm()` delete confirmations with accessible modal components.
- Form validation: tighten validation consistently across remaining forms (length limits, required fields, better inline errors).
- Hooks hygiene: remove remaining `eslint-disable-next-line react-hooks/exhaustive-deps` suppressions by fixing dependencies properly.
- Staff analytics: "At-Risk Students" view is not built yet; keep it out of navigation until implemented (avoid dead links).


