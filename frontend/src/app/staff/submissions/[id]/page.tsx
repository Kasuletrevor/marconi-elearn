"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Download,
  FileText,
  Loader2,
  Save,
  RefreshCw,
  User,
  BookOpen,
  Award,
  Calendar,
  AlertCircle,
  CheckCircle2,
  XCircle,
  EyeOff,
} from "lucide-react";
import {
  courseStaff,
  staffSubmissions,
  type StaffSubmissionDetail,
  type StaffSubmissionUpdate,
  type SubmissionTestResult,
  type TestCase,
  type ZipContents,
  ApiError,
} from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const statusBadge: Record<
  StaffSubmissionDetail["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  grading: { label: "Grading", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  graded: { label: "Graded", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  error: { label: "Error", className: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20" },
};

export default function StaffSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = Number(params.id);

  const [data, setData] = useState<StaffSubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const [isRegrading, setIsRegrading] = useState(false);
  const [isOverride, setIsOverride] = useState(false);

  const [testCases, setTestCases] = useState<TestCase[]>([]);
  const [testResults, setTestResults] = useState<SubmissionTestResult[]>([]);
  const [isTestsLoading, setIsTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState("");
  const [zipOpen, setZipOpen] = useState(false);
  const [zipContents, setZipContents] = useState<ZipContents | null>(null);
  const [zipContentsError, setZipContentsError] = useState("");
  const [isZipContentsLoading, setIsZipContentsLoading] = useState(false);

  const maxPoints = data?.max_points ?? 0;
  const submittedAt = useMemo(() => (data ? new Date(data.submitted_at) : null), [data]);
  const isZip = Boolean(data?.file_name?.toLowerCase().endsWith(".zip"));

  const testCaseById = useMemo(() => new Map(testCases.map((t) => [t.id, t])), [testCases]);
  const totalTestPoints = useMemo(
    () => testCases.reduce((s, t) => s + (t.points ?? 0), 0),
    [testCases]
  );
  const passedCount = useMemo(() => testResults.filter((r) => r.passed).length, [testResults]);
  const scoredTestPoints = useMemo(() => {
    let sum = 0;
    for (const r of testResults) {
      if (!r.passed) continue;
      sum += testCaseById.get(r.test_case_id)?.points ?? 0;
    }
    return sum;
  }, [testCaseById, testResults]);
  const compileOutput = useMemo(
    () => testResults.find((r) => r.compile_output && r.compile_output.trim())?.compile_output ?? "",
    [testResults]
  );
  const orderedResults = useMemo(() => {
    return [...testResults].sort((a, b) => {
      const pa = testCaseById.get(a.test_case_id)?.position ?? 0;
      const pb = testCaseById.get(b.test_case_id)?.position ?? 0;
      if (pa !== pb) return pa - pb;
      return a.test_case_id - b.test_case_id;
    });
  }, [testCaseById, testResults]);

  function formatBytes(bytes: number): string {
    if (!Number.isFinite(bytes) || bytes <= 0) return "0 B";
    const kb = bytes / 1024;
    if (kb < 1024) return `${kb.toFixed(1)} KB`;
    const mb = kb / 1024;
    return `${mb.toFixed(1)} MB`;
  }

  useEffect(() => {
    async function fetchDetail() {
      if (!submissionId || Number.isNaN(submissionId)) {
        setError("Invalid submission ID");
        setIsLoading(false);
        return;
      }
      try {
        const detail = await staffSubmissions.get(submissionId);
        setData(detail);
        setScore(detail.score === null ? "" : String(detail.score));      
        setFeedback(detail.feedback ?? "");
        setIsOverride(false);

        setTestsError("");
        setIsTestsLoading(true);
        try {
          const [results, tcs] = await Promise.all([
            staffSubmissions.tests(detail.id),
            courseStaff.listTestCases(detail.course_id, detail.assignment_id),
          ]);
          setTestResults(results);
          setTestCases(tcs);
        } catch (err) {
          if (err instanceof ApiError) setTestsError(err.detail);
          else setTestsError("Failed to load test results");
        } finally {
          setIsTestsLoading(false);
        }
      } catch (err) {
        if (err instanceof ApiError) setError(err.detail);
        else setError("Failed to load submission");
      } finally {
        setIsLoading(false);
      }
    }

    fetchDetail();
  }, [submissionId]);

  async function handleDownload() {
    if (!data) return;
    try {
      const blob = await staffSubmissions.download(data.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = data.file_name || "submission";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Download failed");
    }
  }

  async function toggleZipContents() {
    if (!data) return;
    if (!isZip) return;
    const next = !zipOpen;
    setZipOpen(next);
    setZipContentsError("");
    if (!next || zipContents) return;

    setIsZipContentsLoading(true);
    try {
      const contents = await staffSubmissions.zipContents(data.id);
      setZipContents(contents);
    } catch (err) {
      if (err instanceof ApiError) setZipContentsError(err.detail);
      else setZipContentsError("Failed to load ZIP contents");
    } finally {
      setIsZipContentsLoading(false);
    }
  }

  async function handleNext() {
    if (!data) return;
    setIsNavigatingNext(true);
    try {
      const res = await staffSubmissions.nextUngraded({
        after_submission_id: data.id,
      });
      if (res.submission_id) {
        router.push(`/staff/submissions/${res.submission_id}`);
      } else {
        setSaveError("No more ungraded submissions");
      }
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to find next submission");
    } finally {
      setIsNavigatingNext(false);
    }
  }

  async function handleSave() {
    if (!data) return;
    if (!isOverride) return;
    setSaveError("");
    setIsSaving(true);
    try {
      const payload: StaffSubmissionUpdate = {
        status: "graded",
        feedback: feedback.trim() === "" ? null : feedback,
      };

      if (score.trim() === "") {
        payload.score = null;
      } else {
        const parsed = Number(score);
        if (Number.isNaN(parsed)) {
          setSaveError("Score must be a number");
          return;
        }
        if (parsed < 0 || parsed > maxPoints) {
          setSaveError(`Score must be between 0 and ${maxPoints}`);       
          return;
        }
        payload.score = parsed;
      }

      await staffSubmissions.update(data.id, payload);
      const refreshed = await staffSubmissions.get(data.id);
      setData(refreshed);
      setScore(refreshed.score === null ? "" : String(refreshed.score));  
      setFeedback(refreshed.feedback ?? "");
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleRegrade() {
    if (!data) return;
    setSaveError("");
    setIsRegrading(true);
    try {
      await staffSubmissions.regrade(data.id);
      const refreshed = await staffSubmissions.get(data.id);
      setData(refreshed);
      setScore(refreshed.score === null ? "" : String(refreshed.score));
      setFeedback(refreshed.feedback ?? "");
      setIsOverride(false);

      setTestsError("");
      setIsTestsLoading(true);
      try {
        const [results, tcs] = await Promise.all([
          staffSubmissions.tests(refreshed.id),
          courseStaff.listTestCases(refreshed.course_id, refreshed.assignment_id),
        ]);
        setTestResults(results);
        setTestCases(tcs);
      } catch (err) {
        if (err instanceof ApiError) setTestsError(err.detail);
        else setTestsError("Failed to load test results");
      } finally {
        setIsTestsLoading(false);
      }
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to regrade");
    } finally {
      setIsRegrading(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <div className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center">
          <AlertCircle className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
          <p className="text-[var(--secondary)]">{error || "Submission not found"}</p>
          <Link href="/staff/submissions" className="inline-block mt-4 text-[var(--primary)] hover:underline">
            Go to queue
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-6">
        <Link href="/staff/submissions" className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors">
          <ArrowLeft className="w-4 h-4" />
          Back to queue
        </Link>
      </motion.div>

      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4">
          <div className="min-w-0">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center">
                <FileText className="w-6 h-6 text-[var(--primary)]" />
              </div>
              <div className="min-w-0">
                <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--foreground)] truncate">
                  {data.assignment_title}
                </h1>
                <p className="text-sm text-[var(--muted-foreground)] truncate">
                  {data.course_code} - {data.course_title}
                </p>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--card)] border border-[var(--border)] text-[var(--muted-foreground)]">
                <User className="w-3.5 h-3.5" />
                {data.student_full_name || data.student_email}
              </span>
              {data.student_number && (
                <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)]">
                  {data.student_number}
                </span>
              )}
              {submittedAt && (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)]">
                  <Calendar className="w-3.5 h-3.5" />
                  {submittedAt.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })}
                </span>
              )}
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[var(--primary)]/10 text-[var(--primary)] border border-[var(--primary)]/20">
                <Award className="w-3.5 h-3.5" />
                {maxPoints} pts
              </span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-wide ${statusBadge[data.status].className}`}
              >
                {statusBadge[data.status].label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleNext}
              disabled={isNavigatingNext}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isNavigatingNext ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <ArrowRight className="w-4 h-4" />
              )}
              Next
            </button>
            <button
              onClick={handleDownload}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </button>
            <button
              disabled={isRegrading}
              onClick={handleRegrade}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isRegrading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Regrade
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="lg:col-span-2">
          <div className="space-y-6">
            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
                Auto-grade Results
              </h2>

              {saveError && (
                <div className="mb-4 p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                  {saveError}
                </div>
              )}

              {isTestsLoading ? (
                <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)]">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Loading test results...
                </div>
              ) : testsError ? (
                <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                  {testsError}
                </div>
              ) : testCases.length === 0 ? (
                <div className="p-4 rounded-2xl bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-sm text-[var(--foreground)] font-medium">
                    No test cases configured
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mt-1">
                    Autograding can’t explain results without tests. Add tests on the assignment page.
                  </p>
                  <Link
                    href={`/staff/courses/${data.course_id}/assignments/${data.assignment_id}`}
                    className="inline-flex items-center gap-2 mt-3 text-sm text-[var(--primary)] hover:underline"
                  >
                    Configure test cases
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="grid md:grid-cols-3 gap-3">
                    <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Score</p>
                      <p className="text-[var(--foreground)] font-semibold">
                        {scoredTestPoints} / {totalTestPoints}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Passed</p>
                      <p className="text-[var(--foreground)] font-semibold">
                        {passedCount} / {testResults.length}
                      </p>
                    </div>
                    <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">Hidden</p>
                      <p className="text-[var(--foreground)] font-semibold">
                        {testCases.filter((t) => t.is_hidden).length}
                      </p>
                    </div>
                  </div>

                  {compileOutput ? (
                    <div className="p-3 rounded-2xl bg-[var(--destructive)]/5 border border-[var(--destructive)]/20">
                      <p className="text-xs font-medium text-[var(--destructive)] mb-2">
                        Compile output
                      </p>
                      <pre className="text-xs whitespace-pre-wrap text-[var(--foreground)] font-mono">
                        {compileOutput}
                      </pre>
                    </div>
                  ) : null}

                  <div className="divide-y divide-[var(--border)] rounded-2xl border border-[var(--border)] bg-[var(--background)] overflow-hidden">
                    {orderedResults.map((r) => {
                      const tc = testCaseById.get(r.test_case_id);
                      const label = tc ? tc.name : `Test #${r.test_case_id}`;
                      const points = tc?.points ?? 0;
                      const hidden = Boolean(tc?.is_hidden);
                      return (
                        <details key={r.id} className="group">
                          <summary className="cursor-pointer list-none px-4 py-3 flex items-center justify-between gap-3 hover:bg-[var(--card)] transition-colors">
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-[var(--foreground)] truncate">
                                {label}
                              </p>
                              <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
                                {points} pts{hidden ? " • hidden" : ""} • outcome {r.outcome}
                              </p>
                            </div>
                            <div className="shrink-0 flex items-center gap-2">
                              {r.passed ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-700 border border-emerald-500/20 text-[11px] font-semibold">
                                  <CheckCircle2 className="w-3.5 h-3.5" />
                                  Pass
                                </span>
                              ) : (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--destructive)]/10 text-[var(--destructive)] border border-[var(--destructive)]/20 text-[11px] font-semibold">
                                  <XCircle className="w-3.5 h-3.5" />
                                  Fail
                                </span>
                              )}
                              {hidden ? (
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-[var(--card)] border border-[var(--border)] text-[11px] text-[var(--muted-foreground)]">
                                  <EyeOff className="w-3.5 h-3.5" />
                                  Hidden
                                </span>
                              ) : null}
                            </div>
                          </summary>
                          <div className="px-4 pb-4">
                            <div className="grid md:grid-cols-2 gap-3 mt-2">
                              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                                <p className="text-xs text-[var(--muted-foreground)] mb-2">Expected stdout</p>
                                <pre className="text-xs whitespace-pre-wrap text-[var(--foreground)] font-mono">
                                  {tc?.expected_stdout ?? ""}
                                </pre>
                              </div>
                              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                                <p className="text-xs text-[var(--muted-foreground)] mb-2">Actual stdout</p>
                                <pre className="text-xs whitespace-pre-wrap text-[var(--foreground)] font-mono">
                                  {r.stdout}
                                </pre>
                              </div>
                              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                                <p className="text-xs text-[var(--muted-foreground)] mb-2">Expected stderr</p>
                                <pre className="text-xs whitespace-pre-wrap text-[var(--foreground)] font-mono">
                                  {tc?.expected_stderr ?? ""}
                                </pre>
                              </div>
                              <div className="p-3 rounded-xl bg-[var(--card)] border border-[var(--border)]">
                                <p className="text-xs text-[var(--muted-foreground)] mb-2">Actual stderr</p>
                                <pre className="text-xs whitespace-pre-wrap text-[var(--foreground)] font-mono">
                                  {r.stderr}
                                </pre>
                              </div>
                            </div>
                          </div>
                        </details>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
              <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
                Manual Override (optional)
              </h2>
              <p className="text-sm text-[var(--muted-foreground)] mb-4">
                Use this only when you need to override the system grade. Publishing an override sets this submission to <span className="font-semibold">graded</span>.
              </p>

              <label className="inline-flex items-center gap-2 text-sm text-[var(--foreground)] cursor-pointer select-none mb-4">
                <input
                  type="checkbox"
                  checked={isOverride}
                  onChange={(e) => setIsOverride(e.target.checked)}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Enable override
              </label>

              <div className="grid md:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                    Score (0-{maxPoints})
                  </label>
                  <input
                    value={score}
                    onChange={(e) => setScore(e.target.value)}
                    disabled={!isOverride}
                    inputMode="numeric"
                    placeholder="e.g. 8"
                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed"
                  />
                </div>
                <div className="flex items-end">
                  <button
                    disabled={!isOverride || isSaving}
                    onClick={handleSave}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Publish override
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Feedback
                </label>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  rows={8}
                  disabled={!isOverride}
                  placeholder="Write structured feedback: correctness, style, and next steps."
                  className="w-full px-3 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y disabled:opacity-60 disabled:cursor-not-allowed"
                />
              </div>
            </div>
          </div>
        </motion.div>

        <motion.div variants={fadeInUp} initial="hidden" animate="visible">
          <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
              Student
            </h2>

            <div className="space-y-3 text-sm">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <User className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="min-w-0">
                  <p className="font-medium text-[var(--foreground)] truncate">
                    {data.student_full_name || "Student"}
                  </p>
                  <p className="text-[var(--muted-foreground)] truncate">{data.student_email}</p>
                </div>
              </div>

              {data.student_programme && (
                <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Programme</p>
                  <p className="text-[var(--foreground)]">{data.student_programme}</p>
                </div>
              )}

              {data.student_number && (
                <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                  <p className="text-xs text-[var(--muted-foreground)] mb-1">Student Number</p>
                  <p className="text-[var(--foreground)]">{data.student_number}</p>
                </div>
              )}
            </div>
          </div>

          <div className="mt-6 p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
              Submission
            </h2>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">File</p>
                <p className="text-[var(--foreground)] break-words">{data.file_name}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Size</p>
                <p className="text-[var(--foreground)]">{Math.round((data.size_bytes / 1024) * 10) / 10} KB</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Content Type</p>
                <p className="text-[var(--foreground)]">{data.content_type || "-"}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Course</p>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <p className="text-[var(--foreground)] truncate">
                    {data.course_code} - {data.course_title}
                  </p>
                </div>
              </div>

              {isZip ? (
                <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                  <div className="flex items-center justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-xs text-[var(--muted-foreground)] mb-1">ZIP contents</p>
                      <p className="text-[var(--foreground)] text-sm">
                        {zipContents
                          ? `${zipContents.file_count} files, ${formatBytes(zipContents.total_size)} total`
                          : "View files inside the ZIP"}
                      </p>
                    </div>
                    <button
                      onClick={toggleZipContents}
                      className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors text-xs"
                    >
                      {zipOpen ? "Hide" : "Show"}
                    </button>
                  </div>

                  {zipOpen ? (
                    <div className="mt-3">
                      {isZipContentsLoading ? (
                        <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
                          <Loader2 className="w-4 h-4 animate-spin" />
                          Loading ZIP contents...
                        </div>
                      ) : zipContentsError ? (
                        <p className="text-xs text-[var(--destructive)]">{zipContentsError}</p>
                      ) : zipContents ? (
                        <div className="mt-2 max-h-64 overflow-y-auto rounded-lg border border-[var(--border)] bg-[var(--card)]">
                          <div className="divide-y divide-[var(--border)]">
                            {zipContents.files.map((f) => (
                              <div key={f.name} className="flex items-center justify-between gap-3 px-3 py-2">
                                <div className="min-w-0 flex items-center gap-2">
                                  <FileText className="w-4 h-4 text-[var(--muted-foreground)] shrink-0" />
                                  <span className="text-sm text-[var(--foreground)] truncate">{f.name}</span>
                                </div>
                                <span className="text-xs text-[var(--muted-foreground)] shrink-0">
                                  {formatBytes(f.size)}
                                </span>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <p className="text-xs text-[var(--muted-foreground)]">No files found.</p>
                      )}
                    </div>
                  ) : null}
                </div>
              ) : null}
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}
