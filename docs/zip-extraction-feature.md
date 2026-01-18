# ZIP Extraction & Multi-File Submission Support

Owner: Trevor  
Last updated: 2026-01-18

## Overview

This feature enables students to submit C/C++ assignments as **ZIP archives** (in addition to single `.c` / `.cpp` files). The platform will:

- Validate ZIP uploads against assignment settings (`allows_zip`).
- Safely inspect/extract ZIP contents in the **worker** (not the API).
- Compile/run via **JOBE** (never inside FastAPI).
- Persist results into Postgres (`submissions`, `submission_test_results`) and present them in UI.

This doc replaces the earlier "single-file ZIP only" plan and reflects the **intended full implementation** (single-file extraction + multi-file projects) while still respecting platform constraints from `spec.md`:

- Execution isolation via JOBE.
- Async grading lifecycle (queue + worker).
- Strong safety checks (zip-bomb limits, traversal protections).

## Design decisions (locked)

| Decision | Choice |
|----------|--------|
| Directory structure | Flat only (no nesting) |
| Makefile requirement | Optional |
| Storage | Store ZIP only; re-extract when needed |
| Missing expected file | Fail with clear error |
| Multi-file without command | Allowed only for single-file ZIPs or `main.c`/`main.cpp`; otherwise require `compile_command` |
| Staff ZIP preview | Yes, with file sizes |
| Compile command security | Whitelist `gcc` / `g++` only (no `make`) |
| Default compile command | If `compile_command` unset, worker uses `main.c`/`main.cpp` (or single-source ZIP); otherwise staff must set `compile_command` |
| ZIP preview file sizes | Yes |

## Motivation

Current single-file submissions block:

1) Modular code (headers + multiple compilation units).  
2) "Real" C/C++ assignments where students build small programs.  
3) Staff visibility into what was submitted (without downloading).

ZIP support unlocks these workflows while keeping execution isolated through JOBE.

## Data model changes

### Assignment fields (new)

Add three nullable fields to `assignments`:

- `allows_zip: bool = False`  
  Enables ZIP uploads for this assignment.
- `expected_filename: str | None = None`  
  Single file to extract from ZIP (e.g. `solution.c`).
- `compile_command: str | None = None`  
  Compile command for multi-file ZIPs (e.g. `gcc main.c utils.c`). (`-o ...` is ignored by JOBE.)      

Migration: add 3 columns to `assignments` table.

Validation rules:
- `expected_filename`: no path separators; max length 255; must not be empty.
- `compile_command`: max length 500; must match whitelist rules (see below).

## ZIP extraction module (worker-only)

Create: `backend/app/worker/zip_extract.py`

### `safe_extract_zip(zip_path, dest_dir) -> list[Path]`

Requirements:
- Validate total file count (<= 50)
- Validate total uncompressed size (<= 10MB)
- Reject path traversal (`../`, absolute paths)
- Reject symlinks
- Reject nested directories (flat only)
- Extract only allowed extensions: `.c`, `.cpp`, `.h`, `.hpp`, `Makefile`
- Return list of extracted file paths

### `extract_expected_file(zip_path, filename, dest_dir) -> Path`

- Open ZIP, look for exact filename
- If not found: raise `ZipExtractionError("solution.c not found in ZIP")`
- Extract only that file
- Return extracted path

### `list_zip_contents(zip_path) -> list[ZipEntryOut]`

Used by staff preview endpoint (no extraction needed):
- Returns names + uncompressed sizes
- Applies the same "no traversal, no absolute path" checks

## Compile command security

We treat this as untrusted input and validate aggressively.

Allowed:
- `gcc ...`
- `g++ ...`

Not supported (with current JOBE server):
- `make` (Jobe's C/Cpp tasks compile via gcc/g++ directly; they do not invoke make)

Hard rules:
- No shell metacharacters (`;`, `&&`, `||`, `|`, `` ` ``, `$()`, `>`, `<`).
- Filenames referenced must be **flat** (no `/` or `\\`).
- `-o <output>` is ignored (Jobe tasks always inject their own `-o <source>.exe`).

## Backend upload validation

Update both upload routes to conditionally allow ZIP based on assignment settings:

- `backend/app/api/routes/student.py`
- `backend/app/api/routes/org_course_submissions.py`

Rules:
- If `.zip` uploaded and `assignment.allows_zip != True` -> 400: "This assignment does not accept ZIP submissions"
- Otherwise accept `.zip` and store it like any other submission, then enqueue grading.

## Worker grading changes

File: `backend/app/worker/grading.py`

Current: single file -> read -> `JobeClient.run()` per test case.

New: ZIP-aware:

1) Detect `.zip` submission path.
2) Load assignment config:
   - If `expected_filename` is set:
     - Extract ZIP (safe, bounded), pick that file as primary.
     - Upload the remaining files to JOBE file cache (for headers/includes).
     - Grade as single file.
   - Else (expected file not set):
     - If `compile_command` is set:
       - Extract ZIP and parse compile_command (`gcc` / `g++`).
       - Upload remaining files to JOBE file cache.
       - Grade the primary file and pass other source files via `linkargs`.
     - If `compile_command` is not set:
       - If ZIP contains exactly one `.c` or `.cpp`: grade it.
       - Else if ZIP contains `main.c` or `main.cpp`: grade that file and include other sources via `linkargs`.
       - Otherwise fail with a clear message asking staff to set `compile_command`.

### Default compile command

If `assignment.allows_zip == True` and `compile_command` is empty, we do not assume a generic build.
We only auto-select when it's unambiguous:
- Single-source ZIPs (one `.c` or `.cpp` file), or
- `main.c` / `main.cpp` exists.

## JOBE integration notes

Multi-file ZIP support uses JOBE's file cache + `file_list` mechanism:
- Upload extra files via `PUT /files/{id}` (cached by hash).
- Reference them in `run_spec.file_list` so they're present during compilation.
- Use `parameters.linkargs` to include additional `.c`/`.cpp` compilation units.

## Staff ZIP preview endpoint

Add endpoint:

`GET /api/v1/staff/submissions/{submission_id}/zip-contents`

Response:
```json
{
  "files": [
    { "name": "main.c", "size": 2458 },
    { "name": "utils.c", "size": 3891 },
    { "name": "utils.h", "size": 412 }
  ],
  "total_size": 6761,
  "file_count": 3
}
```

Notes:
- Names only (no content).
- Uses ZIP inspection (not extraction).
- Returns 400 if the submission is not a ZIP.

## Frontend changes

### Staff: assignment create/edit (course staff page)

File: `frontend/src/app/staff/courses/[id]/page.tsx`

Add fields:
- Checkbox: "Allow ZIP submissions"
- If enabled:
  - `expected_filename` (optional, placeholder `e.g., solution.c`)
  - `compile_command` (optional, placeholder `e.g., gcc main.c utils.c`)
  - Help text:
    - expected file mode vs multi-file mode
    - allowed commands: gcc/g++
    - "flat ZIP only"

### Staff: submission detail page

File: `frontend/src/app/staff/submissions/[id]/page.tsx`

If submission is ZIP:
- Expandable "ZIP Contents" panel
- Shows filenames + sizes + totals

### Student: assignment upload hint

File: `frontend/src/app/dashboard/courses/[id]/assignments/[assignmentId]/page.tsx`

Dynamic copy:
- If `allows_zip == false`: "Upload .c or .cpp"
- If `allows_zip == true`: "Upload .c, .cpp, or .zip"
- If `expected_filename` set: show hint "ZIP must contain: solution.c"

## Error messages (canonical)

| Scenario | Message |
|----------|---------|
| ZIP uploaded but not allowed | "This assignment does not accept ZIP submissions" |
| ZIP too large | "ZIP exceeds maximum size (10MB uncompressed)" |
| Too many files | "ZIP contains too many files (max 50)" |
| Nested directory | "ZIP must have flat structure (no subdirectories)" |
| Path traversal | "Invalid file path in ZIP" |
| Expected file missing | "Required file 'solution.c' not found in ZIP" |
| Multi-file without compile cmd | "Multi-file submission requires assignment to have compile command configured" |
| Invalid compile command | "Compile command is not allowed. Allowed: gcc, g++, make" |

## Implementation order (recommended)

1) Schema + migration (assignment fields).
2) `zip_extract.py` (safe inspection/extraction + tests).
3) Upload validation (conditionally allow `.zip` only when assignment allows it).
4) Worker grading:
   - Phase 1: `expected_filename` single-file ZIP support (no JOBE client change needed).
   - Phase 2: multi-file compilation once JOBE client supports extra files + compile command.
5) Staff ZIP preview endpoint.
6) Frontend: staff assignment form fields + staff submission ZIP contents panel + student hints.
7) End-to-end tests.

## Spec alignment

This plan supports the spec's claim that students can upload `.zip` submissions, while clarifying (and enforcing) safe grading behavior:

- Single-file extraction can ship first.
- Multi-file projects require an explicit compile command and a JOBE client upgrade to transmit extra files safely.
