"use client";

import React, { useCallback, useState } from "react";
import {
  Beaker,
  ChevronDown,
  ChevronUp,
  Loader2,
  MessageSquare,
  RefreshCw,
  AlertCircle,
  Clock,
  CheckCircle2,
} from "lucide-react";
import { student, type Submission, type StudentSubmissionTests, ApiError } from "@/lib/api";

type SubmissionStatus = "pending" | "grading" | "graded" | "error";

const statusConfig: Record<
  SubmissionStatus,
  { label: string; color: string; bgColor: string; icon: React.ElementType }
> = {
  pending: {
    label: "Pending",
    color: "text-[var(--warning)]",
    bgColor: "bg-[var(--warning)]/10",
    icon: Clock,
  },
  grading: {
    label: "Grading",
    color: "text-[var(--info)]",
    bgColor: "bg-[var(--info)]/10",
    icon: RefreshCw,
  },
  graded: {
    label: "Graded",
    color: "text-[var(--success)]",
    bgColor: "bg-[var(--success)]/10",
    icon: CheckCircle2,
  },
  error: {
    label: "Error",
    color: "text-[var(--destructive)]",
    bgColor: "bg-[var(--destructive)]/10",
    icon: AlertCircle,
  },
};

function formatDuration(seconds: number | null | undefined): string {
  if (!seconds || seconds <= 0) return "0m";
  const mins = Math.floor(seconds / 60);
  if (mins < 60) return `${mins}m`;
  const hours = Math.floor(mins / 60);
  const remMins = mins % 60;
  if (hours < 24) return `${hours}h ${remMins}m`;
  const days = Math.floor(hours / 24);
  const remHours = hours % 24;
  return `${days}d ${remHours}h`;
}

function firstLine(text: string): string {
  return text.trim().split(/\r?\n/)[0] ?? "";
}
interface SubmissionCardProps {
  submission: Submission;
  isLatest: boolean;
  maxPoints: number;
  courseId: number;
  assignmentId: number;
  attemptNumber: number;
  totalAttempts: number;
}

export function SubmissionCard({
  submission,
  isLatest,
  maxPoints,
  courseId,
  assignmentId,
  attemptNumber,
  totalAttempts,
}: SubmissionCardProps) {
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isTestsOpen, setIsTestsOpen] = useState(false);
  const [isTestsLoading, setIsTestsLoading] = useState(false);
  const [testsError, setTestsError] = useState("");
  const [testsData, setTestsData] = useState<StudentSubmissionTests | null>(null);
  const [expandedTestId, setExpandedTestId] = useState<number | null>(null);
  const config = statusConfig[submission.status];
  const StatusIcon = config.icon;
  const submittedAt = new Date(submission.submitted_at);
  const fileName =
    submission.file_name ||
    submission.file_path.split("/").pop() ||
    "submission";
  const kindMeta: Record<
    NonNullable<Submission["error_kind"]>,
    { label: string; className: string; hint: string }
  > = {
    compile_error: {
      label: "Compile error",
      className: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
      hint: "Fix compilation errors and resubmit.",
    },
    runtime_error: {
      label: "Runtime error",
      className: "bg-[var(--destructive)]/10 text-[var(--destructive)]",
      hint: "Your program crashed/timed out. Check edge cases and resubmit.",
    },
    infra_error: {
      label: "Infra issue",
      className: "bg-[var(--warning)]/10 text-[var(--warning)]",
      hint: "Platform issue. Retry later or contact course staff.",
    },
    internal_error: {
      label: "System error",
      className: "bg-[var(--secondary)]/10 text-[var(--secondary)]",
      hint: "Unexpected error. Retry; if it persists contact course staff.",
    },
  };

  const submissionKind = submission.error_kind ? kindMeta[submission.error_kind] : null;

  const canShowTests = submission.status === "graded" || submission.status === "error";

  const loadTestsIfNeeded = useCallback(async () => {
    if (!canShowTests) return;
    if (testsData || isTestsLoading) return;
    if (!courseId || !assignmentId) return;

    setIsTestsLoading(true);
    setTestsError("");
    try {
      const data = await student.getSubmissionTests(courseId, assignmentId, submission.id);
      setTestsData(data);
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setTestsError("No test results available yet.");
        } else if (err.status === 401) {
          setTestsError("Not authenticated.");
        } else {
          setTestsError(err.detail || "Failed to load tests.");
        }
      } else {
        setTestsError("Failed to load tests.");
      }
    } finally {
      setIsTestsLoading(false);
    }
  }, [assignmentId, canShowTests, courseId, isTestsLoading, submission.id, testsData]);

  const toggleTests = useCallback(async () => {
    const nextOpen = !isTestsOpen;
    setIsTestsOpen(nextOpen);
    if (nextOpen) {
      await loadTestsIfNeeded();
    }
  }, [isTestsOpen, loadTestsIfNeeded]);

  return (
    <div
      className={`p-4 rounded-xl border transition-all ${
        isLatest
          ? "border-[var(--primary)]/30 bg-[var(--background)]"
          : "border-[var(--border)] bg-[var(--card)]"
      }`}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-6 h-6 rounded-full ${config.bgColor} flex items-center justify-center shrink-0`}>
            <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
          </div>
          <span className={`text-sm font-medium ${config.color}`}>
            {config.label}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] whitespace-nowrap">
            Attempt {attemptNumber} of {totalAttempts}
          </span>
        </div>
        {isLatest && (
          <span className="text-xs bg-[var(--primary)]/10 text-[var(--primary)] px-2 py-0.5 rounded-full shrink-0">
            Latest
          </span>
        )}
      </div>

      <div className="text-xs text-[var(--muted-foreground)] mb-2">       
        <p className="truncate">{fileName}</p>
        <p>
          {submittedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          })}
        </p>
      </div>

      {submissionKind && (
        <div className="mb-2">
          <div className="flex items-center gap-2">
            <span
              className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium ${submissionKind.className}`}
            >
              {submissionKind.label}
            </span>
            {submission.feedback ? (
              <span className="text-[11px] text-[var(--muted-foreground)] truncate">
                {firstLine(submission.feedback)}
              </span>
            ) : null}
          </div>
          <p className="text-[11px] text-[var(--muted-foreground)] mt-1">
            {submissionKind.hint}
          </p>
        </div>
      )}

      {submission.late_penalty_percent !== undefined &&
        submission.late_penalty_percent !== null &&
        submission.late_penalty_percent > 0 && (
          <div className="text-[11px] text-[var(--muted-foreground)] mb-2">
            Late penalty: {submission.late_penalty_percent}% (late by {formatDuration(submission.late_seconds)}).
          </div>
        )}

      {submission.status === "graded" && submission.score !== null && (   
        <div className="pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between mb-1">        
            <span className="text-xs text-[var(--muted-foreground)]">Score</span>
            <span className="font-semibold text-[var(--foreground)]">     
              {submission.score} / {maxPoints}
            </span>
          </div>
          {/* Score bar */}
          <div className="h-2 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--success)] rounded-full transition-all"
              style={{ width: `${(submission.score / maxPoints) * 100}%` }}
            />
          </div>
        </div>
      )}

      {submission.feedback && (
        <div className="mt-3 pt-2 border-t border-[var(--border)]">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
              <MessageSquare className="w-3 h-3" />
              <span>Details</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen((v) => !v)}
              className="text-xs text-[var(--primary)] hover:underline"
            >
              {isDetailsOpen ? "Hide" : "View"}
            </button>
          </div>
          {isDetailsOpen && (
            <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap mt-2">
              {submission.feedback}
            </p>
          )}
        </div>
      )}

      <div className="mt-3 pt-2 border-t border-[var(--border)]">
        <button
          type="button"
          onClick={toggleTests}
          disabled={!canShowTests}
          className={`w-full flex items-center justify-between rounded-lg px-2 py-1.5 transition-colors ${
            canShowTests ? "hover:bg-[var(--muted)]/40" : "opacity-60 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <Beaker className="w-3.5 h-3.5" />
            <span>Autograder tests</span>
            {!canShowTests ? (
              <span className="text-[11px] text-[var(--muted-foreground)]">(available after grading)</span>
            ) : null}
          </div>
          {isTestsOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
          )}
        </button>

        {isTestsOpen && (
          <div className="mt-2 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3">
            <p className="text-[11px] text-[var(--muted-foreground)]">
              You’ll see results for <span className="font-medium">visible</span> tests only. Hidden tests aren’t shown.
            </p>

            {isTestsLoading ? (
              <div className="flex items-center gap-2 mt-3 text-xs text-[var(--muted-foreground)]">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Loading tests…</span>
              </div>
            ) : testsError ? (
              <div className="mt-3 text-xs bg-[var(--destructive)]/10 text-[var(--destructive)] px-3 py-2 rounded-lg">
                {testsError}
              </div>
            ) : (
              <>
                {testsData?.compile_output ? (
                  <div className="mt-3">
                    <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Compile output</div>
                    <pre className="text-[11px] whitespace-pre-wrap bg-[var(--muted)]/30 rounded-lg p-2 border border-[var(--border)] overflow-x-auto">
                      {testsData.compile_output}
                    </pre>
                  </div>
                ) : null}

                <div className="mt-3 space-y-2">
                  {(testsData?.tests ?? []).length === 0 ? (
                    <div className="text-xs text-[var(--muted-foreground)]">
                      No visible tests to display for this submission.
                    </div>
                  ) : (
                    (testsData?.tests ?? []).map((t) => {
                      const isExpanded = expandedTestId === t.test_case_id;
                      return (
                        <div
                          key={t.test_case_id}
                          className="rounded-lg border border-[var(--border)] bg-[var(--background)] p-2"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-medium text-[var(--foreground)] truncate">
                                  {t.name}
                                </span>
                                <span className="text-[11px] text-[var(--muted-foreground)]">{t.points} pts</span>
                              </div>
                              <div className="text-[11px] text-[var(--muted-foreground)]">
                                Test #{t.position}
                              </div>
                            </div>

                            <div className="flex items-center gap-2 shrink-0">
                              <span
                                className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${
                                  t.passed
                                    ? "bg-[var(--success)]/10 text-[var(--success)]"
                                    : "bg-[var(--destructive)]/10 text-[var(--destructive)]"
                                }`}
                              >
                                {t.passed ? "Pass" : "Fail"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTestId((prev) =>
                                    prev === t.test_case_id ? null : t.test_case_id
                                  )
                                }
                                className="text-[11px] text-[var(--primary)] hover:underline"
                              >
                                {isExpanded ? "Hide" : "View"}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="mt-2 grid gap-2">
                              {t.stdin ? (
                                <div>
                                  <div className="text-[11px] text-[var(--muted-foreground)] mb-1">stdin</div>
                                  <pre className="text-[11px] whitespace-pre-wrap bg-[var(--muted)]/30 rounded-lg p-2 border border-[var(--border)] overflow-x-auto">
                                    {t.stdin}
                                  </pre>
                                </div>
                              ) : null}

                              <div className="grid md:grid-cols-2 gap-2">
                                <div>
                                  <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
                                    Expected stdout
                                  </div>
                                  <pre className="text-[11px] whitespace-pre-wrap bg-[var(--muted)]/30 rounded-lg p-2 border border-[var(--border)] overflow-x-auto">
                                    {t.expected_stdout || "∅"}
                                  </pre>
                                </div>
                                <div>
                                  <div className="text-[11px] text-[var(--muted-foreground)] mb-1">Your stdout</div>
                                  <pre className="text-[11px] whitespace-pre-wrap bg-[var(--muted)]/30 rounded-lg p-2 border border-[var(--border)] overflow-x-auto">
                                    {t.stdout || "∅"}
                                  </pre>
                                </div>
                              </div>

                              {(t.expected_stderr || t.stderr) && (
                                <div className="grid md:grid-cols-2 gap-2">
                                  <div>
                                    <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
                                      Expected stderr
                                    </div>
                                    <pre className="text-[11px] whitespace-pre-wrap bg-[var(--muted)]/30 rounded-lg p-2 border border-[var(--border)] overflow-x-auto">
                                      {t.expected_stderr || "∅"}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="text-[11px] text-[var(--muted-foreground)] mb-1">
                                      Your stderr
                                    </div>
                                    <pre className="text-[11px] whitespace-pre-wrap bg-[var(--muted)]/30 rounded-lg p-2 border border-[var(--border)] overflow-x-auto">
                                      {t.stderr || "∅"}
                                    </pre>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
