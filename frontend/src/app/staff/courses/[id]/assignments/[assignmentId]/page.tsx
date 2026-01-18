"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Beaker,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  EyeOff,
  FileText,
  Loader2,
  Plus,
  Save,
  ShieldAlert,
  Trash2,
} from "lucide-react";
import {
  ApiError,
  courseStaff,
  type Assignment,
  type Course,
  type TestCase,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { ConfirmModal } from "@/components/ui/Modal";
import { reportError } from "@/lib/reportError";

const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

function clampInt(raw: string, fallback: number): number {
  const n = Number(raw);
  if (!Number.isFinite(n)) return fallback;
  return Math.trunc(n);
}

function nextPosition(testCases: TestCase[]): number {
  if (testCases.length === 0) return 1;
  return Math.max(...testCases.map((t) => t.position ?? 0)) + 1;
}

function sortByPosition(a: TestCase, b: TestCase): number {
  const pa = a.position ?? 0;
  const pb = b.position ?? 0;
  if (pa !== pb) return pa - pb;
  return a.id - b.id;
}

export default function StaffAssignmentDetailPage() {
  const params = useParams();
  const courseId = Number(params.id);
  const assignmentId = Number(params.assignmentId);

  const [course, setCourse] = useState<Course | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [selectedId, setSelectedId] = useState<number | null>(null);

  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  const [confirmDeleteId, setConfirmDeleteId] = useState<number | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const selected = useMemo(
    () => testCases.find((t) => t.id === selectedId) ?? null,
    [selectedId, testCases]
  );

  const testCasesRef = useRef<TestCase[]>([]);
  useEffect(() => {
    testCasesRef.current = testCases;
  }, [testCases]);

  const stats = useMemo(() => {
    const totalPoints = testCases.reduce((sum, t) => sum + (t.points ?? 0), 0);
    const hiddenCount = testCases.filter((t) => Boolean(t.is_hidden)).length;
    return { totalPoints, hiddenCount };
  }, [testCases]);

  const ordered = useMemo(
    () => [...testCases].sort(sortByPosition),
    [testCases]
  );

  const [draftName, setDraftName] = useState("");
  const [draftPoints, setDraftPoints] = useState("0");
  const [draftHidden, setDraftHidden] = useState(true);
  const [draftStdin, setDraftStdin] = useState("");
  const [draftStdout, setDraftStdout] = useState("");
  const [draftStderr, setDraftStderr] = useState("");

  const hasDraftSelection = selected !== null;

  const hydrateDraft = useCallback((tc: TestCase) => {
    setDraftName(tc.name ?? "");
    setDraftPoints(String(tc.points ?? 0));
    setDraftHidden(Boolean(tc.is_hidden));
    setDraftStdin(tc.stdin ?? "");
    setDraftStdout(tc.expected_stdout ?? "");
    setDraftStderr(tc.expected_stderr ?? "");
  }, []);

  useEffect(() => {
    if (selectedId === null) return;
    const tc = testCasesRef.current.find((t) => t.id === selectedId);
    if (!tc) return;
    hydrateDraft(tc);
  }, [hydrateDraft, selectedId]);

  const fetchAll = useCallback(async () => {
    if (!courseId || Number.isNaN(courseId) || !assignmentId || Number.isNaN(assignmentId)) {
      setError("Invalid course or assignment ID");
      setIsLoading(false);
      return;
    }

    try {
      setError("");
      setIsLoading(true);
      const [c, a, tcs] = await Promise.all([
        courseStaff.getCourse(courseId),
        courseStaff.getAssignment(courseId, assignmentId),
        courseStaff.listTestCases(courseId, assignmentId),
      ]);
      setCourse(c);
      setAssignment(a);
      const sorted = [...tcs].sort(sortByPosition);
      setTestCases(sorted);
      setSelectedId((prev) => {
        if (prev && sorted.some((t) => t.id === prev)) return prev;
        return sorted[0]?.id ?? null;
      });
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load assignment data");
    } finally {
      setIsLoading(false);
    }
  }, [assignmentId, courseId]);

  useEffect(() => {
    fetchAll();
  }, [fetchAll]);

  async function createNew() {
    setSaveError("");
    setIsSaving(true);
    try {
      const created = await courseStaff.createTestCase(courseId, assignmentId, {
        name: `Test ${ordered.length + 1}`,
        position: nextPosition(ordered),
        points: 0,
        is_hidden: true,
        stdin: "",
        expected_stdout: "",
        expected_stderr: "",
      });
      const next = [...testCases, created].sort(sortByPosition);
      setTestCases(next);
      setSelectedId(created.id);
    } catch (err) {
      reportError("Failed to create test case", err);
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to create test case");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveSelected() {
    if (!selected) return;
    setSaveError("");
    setIsSaving(true);
    try {
      const updated = await courseStaff.updateTestCase(courseId, assignmentId, selected.id, {
        name: draftName.trim() || "Untitled",
        points: clampInt(draftPoints, 0),
        is_hidden: draftHidden,
        stdin: draftStdin,
        expected_stdout: draftStdout,
        expected_stderr: draftStderr,
      });
      setTestCases((prev) => prev.map((t) => (t.id === updated.id ? updated : t)).sort(sortByPosition));
    } catch (err) {
      reportError("Failed to save test case", err);
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to save test case");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteConfirmed() {
    if (confirmDeleteId === null) return;
    setIsDeleting(true);
    setSaveError("");
    try {
      await courseStaff.deleteTestCase(courseId, assignmentId, confirmDeleteId);
      setTestCases((prev) => prev.filter((t) => t.id !== confirmDeleteId));
      setSelectedId((prev) => {
        if (prev !== confirmDeleteId) return prev;
        const remaining = ordered.filter((t) => t.id !== confirmDeleteId);
        return remaining[0]?.id ?? null;
      });
    } catch (err) {
      reportError("Failed to delete test case", err);
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to delete test case");
    } finally {
      setIsDeleting(false);
      setConfirmDeleteId(null);
    }
  }

  async function moveSelected(direction: "up" | "down") {
    if (!selected) return;
    const idx = ordered.findIndex((t) => t.id === selected.id);
    const swapWith = direction === "up" ? ordered[idx - 1] : ordered[idx + 1];
    if (!swapWith) return;

    const a = selected;
    const b = swapWith;

    setIsSaving(true);
    setSaveError("");
    try {
      const [ua, ub] = await Promise.all([
        courseStaff.updateTestCase(courseId, assignmentId, a.id, { position: b.position }),
        courseStaff.updateTestCase(courseId, assignmentId, b.id, { position: a.position }),
      ]);
      setTestCases((prev) =>
        prev
          .map((t) => (t.id === ua.id ? ua : t.id === ub.id ? ub : t))
          .sort(sortByPosition)
      );
    } catch (err) {
      reportError("Failed to reorder test cases", err);
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to reorder test cases");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={ShieldAlert}
        title="Couldn't load assignment"
        description={error}
        action={
          <Link
            href={`/staff/courses/${courseId}`}
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to course
          </Link>
        }
      />
    );
  }

  if (!course || !assignment) return null;

  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
  const hasTests = testCases.length > 0;

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title={assignment.title}
        description={`${course.code} • Autograding test cases`}
        action={
          <div className="flex items-center gap-2">
            <Link
              href={`/staff/courses/${courseId}`}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
            <button
              type="button"
              onClick={() => void fetchAll()}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
            >
              Refresh
            </button>
          </div>
        }
      />

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="relative overflow-hidden rounded-3xl border border-[var(--border)] bg-[var(--card)] shadow-sm"
      >
        <div
          className="absolute inset-0 opacity-[0.18] pointer-events-none"
          style={{
            backgroundImage:
              "radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--foreground) 10%, transparent) 1px, transparent 0), radial-gradient(circle at 1px 1px, color-mix(in srgb, var(--primary) 25%, transparent) 1px, transparent 0)",
            backgroundSize: "22px 22px, 66px 66px",
            backgroundPosition: "0 0, 11px 11px",
          }}
        />

        <div className="relative p-6">
          <div className="grid lg:grid-cols-3 gap-6">
            {/* Left rail */}
            <div className="lg:col-span-1">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-[var(--border)]">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      Autograding
                    </p>
                    <p className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)] truncate">
                      {hasTests ? `${testCases.length} tests` : "No tests yet"}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void createNew()}
                      disabled={isSaving}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Add
                    </button>
                  </div>
                </div>

                <div className="px-4 py-3 border-b border-[var(--border)]">
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                      <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider">
                        Total points
                      </p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {stats.totalPoints}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl border border-[var(--border)] bg-[var(--card)]">
                      <p className="text-[11px] text-[var(--muted-foreground)] uppercase tracking-wider">
                        Hidden
                      </p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {stats.hiddenCount}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="max-h-[520px] overflow-y-auto">
                  {ordered.length === 0 ? (
                    <div className="p-6 text-center">
                      <Beaker className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                      <p className="text-sm text-[var(--muted-foreground)]">
                        Autograding is off until you add at least one test.
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Start with a simple “sample input → expected output”.
                      </p>
                    </div>
                  ) : (
                    <div className="divide-y divide-[var(--border)]">
                      {ordered.map((tc, i) => {
                        const isSelected = tc.id === selectedId;
                        return (
                          <button
                            key={tc.id}
                            type="button"
                            onClick={() => setSelectedId(tc.id)}
                            className={`w-full text-left px-4 py-3 transition-colors ${
                              isSelected
                                ? "bg-[var(--primary)]/10"
                                : "hover:bg-[var(--card)]"
                            }`}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                  {i + 1}. {tc.name}
                                </p>
                                <div className="mt-1 flex items-center gap-2 text-[11px] text-[var(--muted-foreground)]">
                                  <span className="inline-flex items-center gap-1">
                                    <FileText className="w-3 h-3" />
                                    {tc.points} pts
                                  </span>
                                  {tc.is_hidden ? (
                                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)]">
                                      <EyeOff className="w-3 h-3" />
                                      Hidden
                                    </span>
                                  ) : null}
                                </div>
                              </div>
                              {isSelected ? (
                                <CheckCircle2 className="w-4 h-4 text-[var(--primary)] shrink-0 mt-0.5" />
                              ) : null}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]">
                <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Comparison rules
                </p>
                <ul className="space-y-1 text-sm text-[var(--foreground)]">
                  <li>CRLF is normalized to LF</li>
                  <li>Trailing EOF whitespace is ignored</li>
                  <li>Internal whitespace is strict</li>
                </ul>
              </div>
            </div>

            {/* Editor */}
            <div className="lg:col-span-2">
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                <div className="flex items-center justify-between gap-3 px-5 py-4 border-b border-[var(--border)]">
                  <div className="min-w-0">
                    <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)]">
                      Assignment
                    </p>
                    <p className="text-sm text-[var(--foreground)] truncate">
                      Max points: {assignment.max_points}
                      {dueDate ? ` • Due ${dueDate.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}` : ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => void saveSelected()}
                      disabled={!hasDraftSelection || isSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
                    >
                      {isSaving ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : (
                        <Save className="w-4 h-4" />
                      )}
                      Save
                    </button>
                  </div>
                </div>

                {saveError ? (
                  <div className="px-5 pt-4">
                    <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                      {saveError}
                    </div>
                  </div>
                ) : null}

                {!selected ? (
                  <div className="p-8 text-center">
                    <p className="text-sm text-[var(--muted-foreground)]">
                      Select a test case on the left to edit it.
                    </p>
                  </div>
                ) : (
                  <div className="p-5 space-y-5">
                    <div className="grid md:grid-cols-3 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                          Name
                        </label>
                        <input
                          value={draftName}
                          onChange={(e) => setDraftName(e.target.value)}
                          className="w-full px-3 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          placeholder="e.g., Sample #1"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                          Points
                        </label>
                        <input
                          value={draftPoints}
                          onChange={(e) => setDraftPoints(e.target.value)}
                          inputMode="numeric"
                          className="w-full px-3 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                          placeholder="e.g., 10"
                        />
                      </div>
                    </div>

                    <div className="flex items-center justify-between gap-3">
                      <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={draftHidden}
                          onChange={(e) => setDraftHidden(e.target.checked)}
                          className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                        />
                        Hidden from students
                      </label>

                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => void moveSelected("up")}
                          disabled={isSaving || ordered.findIndex((t) => t.id === selected.id) === 0}
                          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move up"
                          title="Move up"
                        >
                          <ChevronUp className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => void moveSelected("down")}
                          disabled={
                            isSaving ||
                            ordered.findIndex((t) => t.id === selected.id) === ordered.length - 1
                          }
                          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Move down"
                          title="Move down"
                        >
                          <ChevronDown className="w-4 h-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setConfirmDeleteId(selected.id)}
                          disabled={isSaving}
                          className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--destructive)]/10 hover:text-[var(--destructive)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          aria-label="Delete test case"
                          title="Delete test case"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                          stdin
                        </label>
                        <textarea
                          value={draftStdin}
                          onChange={(e) => setDraftStdin(e.target.value)}
                          rows={6}
                          className="w-full px-3 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono text-sm"
                          placeholder="Input passed to the program (stdin)."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                          expected stdout
                        </label>
                        <textarea
                          value={draftStdout}
                          onChange={(e) => setDraftStdout(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono text-sm"
                          placeholder="Exact expected stdout."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                          expected stderr
                        </label>
                        <textarea
                          value={draftStderr}
                          onChange={(e) => setDraftStderr(e.target.value)}
                          rows={8}
                          className="w-full px-3 py-2.5 rounded-2xl bg-[var(--card)] border border-[var(--border)] text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] font-mono text-sm"
                          placeholder="Expected stderr (usually empty)."
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div className="mt-4 p-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]">
                <p className="text-xs uppercase tracking-wider text-[var(--muted-foreground)] mb-2">
                  Next
                </p>
                <p className="text-sm text-[var(--foreground)]">
                  Autograding becomes meaningful once tests exist. Students will get a clearer “passed/failed” story once we wire student visibility (still open).
                </p>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      <ConfirmModal
        isOpen={confirmDeleteId !== null}
        onClose={() => setConfirmDeleteId(null)}
        onConfirm={() => void deleteConfirmed()}
        title="Delete test case?"
        description="This removes the test case and any future grading will no longer include it."
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={isDeleting}
      />
    </div>
  );
}
