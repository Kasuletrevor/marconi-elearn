# Marconi Elearn - Educational Platform Specification

> A modern Learning Management System for lecturers to manage courses, assignments, and provide AI-powered feedback on student code submissions.

## 1. Overview

**Marconi Elearn** is a web-based platform designed for university lecturers to:
- Manage multiple courses across semesters
- Organize course content into modules with resources
- Create and distribute programming assignments
- Collect student code submissions (file uploads) and auto-grade against hidden C/C++ tests
- Provide automated AI-powered code review and grading

### Target Users
| Role | Description |
|------|-------------|
| **Super Admin** | Manages organizations, creates lecturer accounts |
| **Lecturer/Owner** | Creates courses, full control over their courses |
| **Co-Lecturer** | Can manage course content, grade submissions |
| **Teaching Assistant** | Can view submissions, provide feedback |
| **Student** | Accesses course materials, submits assignments |

### Scale
- ~220 students per course
- Multiple lecturers with independent course management
- Semester-based course organization

---

## 2. Core Features

### 2.1 Multi-Tenant Architecture

> [!IMPORTANT]
> Explicit tenant model prevents access-control bugs when multiple lecturers share the platform.

```
Organization (tenant)
- Name (e.g., "Makerere University - CS Dept")
- Members (Lecturers, TAs)
- Courses
  - Course
    - Roles: Owner, Co-Lecturer, TA, Student
```

**Role Permissions Matrix**:

| Action | Owner | Co-Lecturer | TA | Student |
|--------|-------|-------------|----|---------|
| Create/Delete Course | Yes | No | No | No |
| Edit Course Settings | Yes | Yes | No | No |
| Manage Enrollments | Yes | Yes | No | No |
| Create Assignments | Yes | Yes | No | No |
| Grade Submissions | Yes | Yes | Yes | No |
| View All Submissions | Yes | Yes | Yes | No |
| Submit Assignments | No | No | No | Yes |
| View Own Grades | No | No | No | Yes |

### 2.2 Authentication & User Management

> [!CAUTION]
> **No JWT for sessions.** Use server-side sessions (DB-backed) for proper revocation, role changes, and session invalidation.

**Approach**: Invite-based with secure onboarding (no self-registration)

| Feature | Description |
|---------|-------------|
| Session Management | Backend-managed sessions stored in PostgreSQL (HTTP-only cookie) |
| Lecturer Onboarding | Super-admin sends invite link |
| Student Enrollment | Single-use invite links (time-boxed, 7 days) |
| First Login | Forced password set on first login |
| Alternative | Passwordless magic links (optional) |

**Secure Invite Flow**:
```
1. Lecturer adds students by email (CSV or manual)
2. System generates single-use invite tokens (expires in 7 days)
3. Email contains link: /invite/{token}
4. Student clicks link -> sets password -> account activated
5. Token invalidated after use
```

**Session Security**:
- Server-side sessions stored in PostgreSQL
- Immediate invalidation on logout/role change
- Session timeout after inactivity (configurable)
- Concurrent session limits (optional)

### 2.3 Course Management

```
Course
- Title, Description, Code (e.g., "CS101")
- Semester/Year (e.g., "Year 1, Semester 2")
- Organization (tenant)
- Roles (owner, co-lecturers, TAs)
- Enrolled Students
- Late Policy Settings
- Modules
  - Module 1: Introduction to C
    - Resources (PDFs, links, videos)
    - Assignments
  - Module 2: Control Structures
  - ...
```

**Lecturer Capabilities**:
- Create/edit/archive courses
- Add co-lecturers and TAs with scoped roles
- Create modules within courses
- Upload resources (PDF, documents, links, videos)
- Manage student enrollment (add/remove)
- Grant deadline extensions to individual students

### 2.4 Assignment System

| Field | Description |
|-------|-------------|
| Title | Assignment name |
| Description | Instructions (Markdown supported) |
| Due Date | Submission deadline |
| Language | C or C++ |
| Starter Code | Optional template code |
| Test Cases | Hidden test cases for auto-grading |
| Max Points | Total points available |
| Rubric | Grading criteria for AI review |
| Late Policy | Inherit from course or override |
| AI Review | Enabled/Disabled per assignment |

**Features**:
- Visible/hidden test cases
- Multiple submission attempts allowed
- Late submission handling with configurable penalties
- Per-student deadline extensions
- Offline download (PDF + starter code ZIP)

### 2.5 Code Execution (Isolated System)

> [!WARNING]
> **Code execution runs as a completely separate system.** Never run student code inside the main web app.

**Architecture**:
```
Main Web App (Vercel) -> Job Queue (Redis/DB) -> JOBE Server (Render)
  - App enqueues execution jobs after a submission upload
  - JOBE compiles/runs against test cases with strict limits
  - Results are persisted (DB) and shown in the UI (status, stdout/stderr, pass/fail)
```

**Safety Measures**:

| Measure | Implementation |
|---------|----------------|
| Isolation | JOBE runs in separate Docker container on Render |
| Queue | Submissions queued, not executed synchronously |
| Rate Limits | Per-user: 10 runs/min, Per-course: 100 runs/min |
| Resource Caps | Time: 10s, Memory: 256MB, Output: 64KB |
| Burst Handling | Queue with priority (deadline proximity) |
| Retries | Automatic retry with exponential backoff |

**Technology**: [JOBE Server](https://github.com/trampgeek/jobe)
- Purpose-built for educational code execution
- Battle-tested in Moodle's CodeRunner
- Excellent C/C++ sandboxing

### 2.6 AI-Powered Features

> [!IMPORTANT]
> AI reviews are **async**, **optional**, and **budget-capped** to prevent cost incidents.

#### Auto-Grading (Always On)
- Run submitted code against test cases
- Assign points based on passing tests
- Immediate feedback to students

#### AI Code Review (Opt-In, Async)

| Setting | Value |
|---------|-------|
| Default | Disabled per assignment |
| Trigger | Manual request or assignment setting |
| Processing | Async via job queue |
| Budget Cap | Per-org monthly limit (configurable) |
| Cost Tracking | Dashboard shows usage per course |

**Budget Controls**:
```
Organization AI Budget:
- Monthly limit: 50 USD (configurable)
- Alert threshold: 80% usage
- Hard stop: 100% (pause new AI jobs)
- Per-review estimate: ~0.02 USD
```
**Review Features**:
- Code quality, style, best practices analysis
- Configurable review depth per assignment
- Lecturer can approve/edit AI feedback before release

### 2.7 Grading & Feedback

| Component | Weight (Configurable) |
|-----------|----------------------|
| Test Cases Passed | 60% |
| Code Quality (AI) | 25% |
| Manual Adjustment | 15% |

**Lecturer Override**: Can adjust any grade with comments

---

## 3. Operational Requirements

> [!IMPORTANT]
> These are must-haves for a production educational platform.

### 3.1 Audit Logging

All sensitive actions are logged with timestamp, user, IP, and details:

| Event | Logged Data |
|-------|-------------|
| Grade Changes | Before/after values, reason, grader |
| Role Changes | Who changed, old/new role |
| Deadline Extensions | Student, original/new deadline, reason |
| Submission Retractions | If allowed, who and when |
| Login/Logout | User, IP, user agent |

### 3.2 Data Export

| Export | Format | Access |
|--------|--------|--------|
| Gradebook | CSV, Excel | Lecturer+ |
| Student Roster | CSV | Lecturer+ |
| Submission Archive | ZIP (code + metadata) | Lecturer+ |
| Audit Logs | CSV | Owner only |

### 3.3 Late Policy & Extensions

**Course-Level Policy**:
```
Late Policy Options:
- No late submissions
- Deduct X% per day (max Y days)
- Grace period (hours after deadline)
- Custom (per assignment override)
```

**Individual Extensions**:
- Lecturer can grant per-student deadline extensions
- Extension reason logged for audit
- Student sees adjusted deadline in their view

### 3.4 Observability

| Component | Monitoring |
|-----------|------------|
| JOBE Execution | Success/failure rates, queue depth, latency |
| API Endpoints | Response times, error rates |
| AI Reviews | Queue depth, processing time, costs |
| Email Delivery | Sent/failed counts |

**Dashboard for Lecturers**:
- Submission stats per assignment
- Execution failure alerts
- AI budget usage

---

## 4. Technical Architecture

### 4.1 Tech Stack

| Layer | Technology | Deployment |
|-------|------------|------------|
| Frontend | Next.js 14 (App Router) | Vercel |
| Backend API | FastAPI (Python) | Render / Fly.io |
| Database | PostgreSQL | Render / Neon |
| ORM | SQLAlchemy 2.0 | - |
| Migrations | Alembic | - |
| Job Queue | Redis + worker (BullMQ/Celery/RQ) | Render |
| Code Execution | JOBE Server | Render (Docker) |
| AI | OpenAI API (GPT-4) | - |
| File Storage | Vercel Blob / S3-compatible | - |
| Email | Gmail SMTP (Nodemailer) | - |

### 4.2 Database Schema

```
Core entities (high-level):
- Organization
- User
- Course
- CourseRole (join table: user <-> course, role enum: owner/co_lecturer/ta/student)
- Module
- Resource
- Assignment
- TestCase
- Submission (stores file artifact reference + execution results + grade)
- InviteToken (single-use, time-boxed)
- Extension (per-student deadline override)
- AuditLog
- Session (server-side, DB-backed cookie sessions)
- AIReview (async job + stored feedback)

Key relationships:
- Organization 1..* User, 1..* Course
- Course 1..* Module, 1..* Assignment, 1..* CourseRole
- Module 1..* Resource, 1..* Assignment
- Assignment 1..* TestCase, 1..* Submission
- Submission belongs to (Assignment, Student(User)); contains (score, stdout/stderr summary, pass/fail breakdown)
- Extension belongs to (Course, Assignment optional, Student(User))
- AuditLog belongs to (Organization, actor User) with optional foreign keys (Course/Assignment/Submission)
```

### 4.3 Key API Routes

```
/api/v1/auth/*        - Authentication (login/logout/me, sessions)
/api/v1/orgs/*        - Organization management
/api/v1/courses/*     - Course CRUD
/api/v1/modules/*     - Module management
/api/v1/assignments/* - Assignment management
/api/v1/submissions/* - Code submissions
/api/v1/jobs/execute  - Queue code execution
/api/v1/jobs/ai-review- Queue AI review
/api/v1/users/*       - User management
/api/v1/invites/*     - Invite token management
/api/v1/export/*      - CSV/data exports
/api/v1/audit/*       - Audit log queries
/api/v1/download/*    - Offline assignment downloads
```

---

## 5. User Interface

### 5.1 Lecturer Dashboard
- Course overview cards
- Recent submissions requiring review
- Quick stats (students, pending grades)
- AI budget usage indicator
- Execution health status
- Create new course/assignment buttons

### 5.2 Course Page (Lecturer View)
- Module list with drag-and-drop reordering
- Student roster with enrollment management
- Assignment list with submission stats
- Gradebook view with CSV export
- Audit log viewer (owner only)

### 5.3 Student Dashboard
- Enrolled courses
- Upcoming deadlines (with extension indicators)
- Recent grades/feedback

### 5.4 Assignment View (Student)
- Instructions panel
- Download starter code (ZIP) + PDF instructions
- Upload submission (e.g., `.c`, `.cpp`, or `.zip`)
- Optional read-only code preview (for quick verification)
- Submit -> queued auto-grading against hidden tests
- Queue position indicator (during burst traffic)
- Previous submissions history (status + results)
- **Download for Offline** button (PDF + starter code ZIP)

### 5.5 Submission Review (Lecturer)
- Side-by-side: student code + AI feedback
- Test case results
- Grading panel with rubric
- Comment/feedback editor
- Grade change audit trail

---

## 6. Development Phases

### Phase 1: Foundation (Week 1-2)
- [x] Backend scaffold (FastAPI, SQLAlchemy, Alembic)
- [x] Organization/User/Course membership models (initial)
- [x] Alembic migrations (initial)
- [x] API + CRUD test harness (pytest + async)
- [x] DB-backed cookie sessions (login/logout/me)
- [ ] Organization/tenant model
- [ ] Role-based access control
- [ ] Invite system with single-use tokens

### Phase 2: Course Management (Week 2-3)
- [ ] Course CRUD with role scoping
- [ ] Module management
- [ ] Resource uploads
- [ ] Student enrollment (CSV upload)
- [ ] Late policy configuration

### Phase 3: Assignments & Submissions (Week 3-4)
- [ ] Assignment creation
- [ ] Submission upload (file validation + storage + metadata)
- [ ] Submission history + results UI
- [ ] Submission system with queue
- [ ] Offline download feature

### Phase 4: Code Execution (Week 4-5)
- [ ] JOBE server deployment on Render
- [ ] Job queue implementation
- [ ] Rate limiting and resource caps
- [ ] Test case execution
- [ ] Auto-grading logic
- [ ] Execution observability

### Phase 5: AI Integration (Week 5-6)
- [ ] OpenAI integration with async queue
- [ ] Budget tracking and alerts
- [ ] Code review prompts
- [ ] Feedback approval workflow

### Phase 6: Operations & Polish (Week 6-7)
- [ ] Audit logging
- [ ] CSV exports
- [ ] Email notifications
- [ ] UI/UX refinement
- [ ] Deploy to Vercel + Render

---

## 7. Environment Variables

```env
# Database
DATABASE_URL=postgresql://...

# Frontend
NEXTAUTH_SECRET=your-secret-key
NEXTAUTH_URL=https://marconi-elearn.vercel.app
NEXT_PUBLIC_API_BASE_URL=http://localhost:8000

# Code Execution (JOBE)
JOBE_SERVER_URL=https://your-jobe-instance.render.com
JOBE_API_KEY=optional-key

# Job Queue
REDIS_URL=redis://...

# AI
OPENAI_API_KEY=sk-...
AI_MONTHLY_BUDGET_CENTS=5000

# Email (Gmail SMTP)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-email@gmail.com
SMTP_PASS=your-app-password

# Note: Gmail SMTP is fine for development and small pilots, but can be brittle at semester scale
# (rate limits, spam filtering/deliverability, account security changes). For production, prefer a
# transactional email provider (Resend/SendGrid/Mailgun) or your university SMTP if available.

# Storage
BLOB_READ_WRITE_TOKEN=vercel_blob_...
```

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Code Execution | Isolated JOBE container, resource limits, separate network |
| Session Hijacking | Server-side sessions, secure cookies, CSRF protection |
| SQL Injection | SQLAlchemy parameterized queries |
| XSS | React's built-in escaping + CSP headers |
| Invite Token Leaks | Single-use, time-boxed, secure random generation |
| File Uploads | Type validation, size limits, separate storage |
| Rate Limiting | Per-user and per-course limits on execution |
| Role Escalation | Course-scoped roles, explicit permission checks |

---

## 9. Future Enhancements (Post-MVP)

- [ ] Plagiarism detection (code similarity)
- [ ] Discussion forums per course
- [ ] Live coding sessions
- [ ] GitHub integration for submissions
- [ ] Mobile app
- [ ] Analytics dashboard
- [ ] Support for more languages (Python, Java)
- [ ] Offline-first PWA mode
- [ ] SSO integration (university LDAP)

---

## 10. Decisions Made

| Question | Decision |
|----------|----------|
| Platform Name | **Marconi Elearn** |
| Email Provider | Gmail SMTP with app password |
| Submissions (MVP) | File upload (`.c`/`.cpp`/`.zip`) + hidden-test auto-grading |
| Code Editor (MVP) | No in-browser IDE; optional read-only code preview |
| AI Budget | Optional; budget-capped when enabled (amount TBD) |
| Offline Work | Yes. Students can download assignments (PDF + starter code) |
| Code Execution | JOBE Server (self-hosted on Render) |
| Authentication | FastAPI auth; DB-backed cookie sessions (not JWT) |
| Invites | Single-use, time-boxed invite links |
| Multi-Tenant | Organization model with course-scoped roles |
| AI Reviews | Async, optional, budget-capped |
| Operational | Audit logs, CSV exports, late policy, observability |



