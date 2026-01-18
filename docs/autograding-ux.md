# Autograding UX Map (Staff-first)

Goal: make autograding understandable and trustworthy.

Previously, staff could change `Submission.status` manually (Pending/Grading/Graded/Error) in the UI. That was misleading because grading should be system-owned and deterministic.

This doc maps the intended UX so we can implement it incrementally and keep student visibility adjustable.

---

## Mental Model

- Autograding = run student code against configured test cases.
- System status is owned by the platform:
  - `pending` -> queued
  - `grading` -> worker running
  - `graded` -> results stored
  - `error` -> infra / internal / unrecoverable errors
- Manual override is explicit and auditable:
  - staff can override score + feedback and publish a grade
  - override is separate from "autograde"

---

## Primary Staff Flows

### 1) Configure tests

Entry points:
- Course -> Assignments list -> "Tests" / "Test cases" for an assignment row
- Course overview -> quick actions ("Create assignment") should funnel into creating an assignment, then configuring tests (iterative improvement)

Screen: Assignment detail (staff) `/staff/courses/:courseId/assignments/:assignmentId`

Key content:
- Assignment header (title, due date, points, ZIP settings)
- Autograding status card:
  - `0 test cases` (autograding effectively off) -> CTA "Add test case"
  - `N test cases (X hidden)` -> CTA "Manage test cases"
- Test case builder (see below)

### 2) Review graded work

Entry points:
- Global submissions queue
- Course queue (inside course page)
- Submission detail page

Staff submission detail must:
- show autograde results (pass/fail per test case, points)
- show compile/runtime errors cleanly (compile output once, then per-test outcomes)
- keep manual override explicit and separate

---

## Test Case Builder (Staff)

Layout: two-pane "lab notebook"

Left rail:
- ordered list of test cases
- points + hidden badge
- quick actions: add, move up/down, delete (duplicate is future)

Right pane editor:
- name, points, hidden toggle
- inputs/expectations:
  - `stdin`
  - `expected_stdout`
  - `expected_stderr`
- comparison rules (current assumption, can be tuned later):
  - normalize CRLF
  - ignore trailing EOF whitespace
  - internal whitespace strict

---

## Submissions Queue (Staff)

Queue rows should communicate:
- student identity
- assignment
- submitted time
- system status
- score summary if available

Remove "mark grading/graded/reset" bulk status controls.

Replace with:
- optional "regrade selected" (implemented as N requests)
- keep status filterable for triage (pending/grading/graded/error)

---

## Submission Detail (Staff)

Sections:

1) Autograde results
- summary: "Passed X/Y, Score A/B"
- per test case: pass/fail, points, hidden badge
- expand for actual stdout/stderr, compile output, outcome code

2) Manual override
- toggle "Override grade"
- edit score + feedback
- action "Publish override" (writes `status=graded` + score/feedback)
- future: "Reset override" (clears score/feedback, triggers regrade)

3) Submission artifact
- download / ZIP contents browsing

---

## Student Visibility (Adjustable; current implementation = 3c)

We treat student visibility as a policy toggle later. The platform stores per-test results, so the student UI can pivot between:

- A) score + error kind only
- B) show pass/fail counts, hide hidden test details
- C) show per-test details for non-hidden tests (no hidden leakage)

Current implementation is (C) in a safe form:
- Students can view per-test pass/fail + expected/actual output for tests where `is_hidden=false` only.
- Hidden tests are never listed and never returned by the student endpoint.

