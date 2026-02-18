"use client";

import { useState, useCallback, useMemo } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  FileText,
  Calendar,
  Clock,
  Award,
  Upload,
  CheckCircle2,
  AlertCircle,
  Loader2,
  File,
  X,
  RefreshCw,
  MessageSquare,
  Beaker,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  student,
  type Assignment,
  type Submission,
  type Course,
  type LatePolicy,
  type StudentSubmissionTests,
  ApiError,
} from "@/lib/api";
import { truncateOutput } from "@/lib/truncateOutput";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

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

function resolveLatePolicy(course: Course, assignment: Assignment): LatePolicy | null {
  const raw = assignment.late_policy ?? course.late_policy ?? null;
  if (!raw) return null;
  if (raw.enabled === false) return null;
  return {
    enabled: true,
    type: "percent_per_day",
    grace_minutes: Number(raw.grace_minutes ?? 0) || 0,
    percent_per_day: Number(raw.percent_per_day ?? 0) || 0,
    max_percent: Number(raw.max_percent ?? 100) || 100,
  };
}

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

function getFileExtension(fileName: string): string {
  const normalized = fileName.trim().toLowerCase();
  const lastDotIndex = normalized.lastIndexOf(".");
  if (lastDotIndex <= 0 || lastDotIndex === normalized.length - 1) return "";
  return normalized.slice(lastDotIndex);
}

interface StudentAssignmentDetailClientProps {
  courseId: number;
  assignmentId: number;
  initialCourse: Course | null;
  initialAssignment: Assignment | null;
  initialSubmissions: Submission[];
  initialError: string;
}

export default function StudentAssignmentDetailClient({
  courseId,
  assignmentId,
  initialCourse,
  initialAssignment,
  initialSubmissions,
  initialError,
}: StudentAssignmentDetailClientProps) {
  const router = useRouter();

  const [course] = useState<Course | null>(initialCourse);
  const [assignment] = useState<Assignment | null>(initialAssignment);
  const [submissions, setSubmissions] = useState<Submission[]>(initialSubmissions);
  const [isLoading] = useState(false);
  const [error] = useState(initialError);

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const allowsZip = Boolean(assignment?.allows_zip);
  const expectedZipFile = assignment?.expected_filename ?? null;
  const allowedExtensions = useMemo(
    () => (allowsZip ? [".c", ".cpp", ".zip"] : [".c", ".cpp"]),
    [allowsZip]
  );
  const acceptAttr = allowedExtensions.join(",");

  const validateAndSetFile = useCallback((file: File) => {
    const extension = getFileExtension(file.name);
    const isValid = allowedExtensions.includes(extension);

    if (!isValid) {
      setUploadError(`Please upload ${allowsZip ? "a .c, .cpp, or .zip" : "a .c or .cpp"} file`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
  }, [allowedExtensions, allowsZip]);

  // Drag and drop handlers
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    setUploadError("");

    const files = e.dataTransfer.files;
    if (files.length > 0) {
      validateAndSetFile(files[0]);
    }
  }, [validateAndSetFile]);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  }, [validateAndSetFile]);

  const clearFile = () => {
    setSelectedFile(null);
    setUploadError("");
  };

  const handleSubmit = async () => {
    if (!selectedFile) return;

    setIsUploading(true);
    setUploadError("");

    try {
      await student.submitAssignment(courseId, assignmentId, selectedFile);
      setSelectedFile(null);
      // Refresh submissions
      const updatedSubmissions = await student.getSubmissions(courseId, assignmentId);
      setSubmissions(updatedSubmissions.sort((a, b) => 
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      ));
    } catch (err) {
      if (err instanceof ApiError) {
        setUploadError(err.detail);
      } else {
        setUploadError("Failed to submit assignment");
      }
    } finally {
      setIsUploading(false);
    }
  };

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back</span>
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center"
        >
          <AlertCircle className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
          <p className="text-[var(--secondary)]">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block mt-4 text-[var(--primary)] hover:underline"
          >
            Go to dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!assignment || !course) return null;

  const dueDateRaw = assignment.effective_due_date ?? assignment.due_date;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const isPastDue = dueDate && dueDate < new Date();
  const hasExtension = Boolean(assignment.has_extension && assignment.effective_due_date);
  const latestSubmission = submissions[0];
  const hasGradedSubmission = submissions.some((s) => s.status === "graded");   
  const latePolicy = resolveLatePolicy(course, assignment);
  const latePolicySummary =
    !dueDate
      ? "No due date set."
      : latePolicy
      ? `Late policy: ${latePolicy.grace_minutes} min grace, ${latePolicy.percent_per_day}% per day, max ${latePolicy.max_percent}%.`
      : "Late policy: not configured (no penalties).";

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to {course.code}</span>
        </Link>
      </motion.div>

      {/* Assignment Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start gap-4 mb-4">
          <div
            className={`w-14 h-14 rounded-xl flex items-center justify-center shrink-0 ${
              isPastDue ? "bg-[var(--secondary)]/10" : "bg-[var(--primary)]/10"
            }`}
          >
            <FileText
              className={`w-7 h-7 ${
                isPastDue ? "text-[var(--secondary)]" : "text-[var(--primary)]"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] rounded-md mb-2">
              {course.code}
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-3xl md:text-4xl font-bold text-[var(--foreground)]">
              {assignment.title}
            </h1>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-4 text-sm">
          {dueDate && (
            <div
              className={`flex items-center gap-1.5 ${
                isPastDue ? "text-[var(--secondary)]" : "text-[var(--muted-foreground)]"
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>
                {isPastDue ? "Past due: " : "Due: "}
                {dueDate.toLocaleDateString("en-US", {
                  weekday: "short",
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          {hasExtension && (
            <span className="inline-flex items-center gap-1.5 px-2 py-1 rounded-md bg-[var(--secondary)]/10 text-[var(--secondary)] text-xs font-medium">
              Deadline extension
            </span>
          )}
          <div className="flex items-center gap-1.5 text-[var(--muted-foreground)]">
            <Award className="w-4 h-4" />
            <span>{assignment.max_points} points</span>
          </div>
          {hasGradedSubmission && (
            <div className="flex items-center gap-1.5 text-[var(--success)]">
              <CheckCircle2 className="w-4 h-4" />
              <span>Graded</span>
            </div>
          )}
        </div>

        <p className="mt-3 text-xs text-[var(--muted-foreground)]">
          {latePolicySummary} You can resubmit unlimited times; the latest submission counts.
        </p>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid lg:grid-cols-5 gap-6"
      >
        {/* Left column - Description & Instructions */}
        <motion.div variants={fadeInUp} className="lg:col-span-3 space-y-6">
          {/* Description */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-4">
              Instructions
            </h2>
            {assignment.description ? (
              <div className="prose prose-sm max-w-none text-[var(--muted-foreground)]">
                <p className="whitespace-pre-wrap">{assignment.description}</p>
              </div>
            ) : (
              <p className="text-[var(--muted-foreground)] italic">
                No instructions provided.
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-4">
              Submit Your Work
            </h2>

            {/* Drag and drop zone */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              className={`relative border-2 border-dashed rounded-xl p-8 text-center transition-all ${
                isDragging
                  ? "border-[var(--primary)] bg-[var(--primary)]/5"
                  : selectedFile
                  ? "border-[var(--success)] bg-[var(--success)]/5"
                  : "border-[var(--border)] hover:border-[var(--primary)]/50"
              }`}
            >
              {selectedFile ? (
                <div className="flex items-center justify-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--success)]/10 flex items-center justify-center">
                    <File className="w-5 h-5 text-[var(--success)]" />
                  </div>
                  <div className="text-left">
                    <p className="font-medium text-[var(--foreground)]">
                      {selectedFile.name}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {(selectedFile.size / 1024).toFixed(1)} KB
                    </p>
                  </div>
                  <button
                    onClick={clearFile}
                    className="ml-2 p-1 rounded-full hover:bg-[var(--background)] transition-colors"
                  >
                    <X className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>
                </div>
              ) : (
                <>
                  <Upload className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                  <p className="text-[var(--foreground)] font-medium mb-1">
                    Drag and drop your file here
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)] mb-4">
                    or click to browse
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Accepts {allowsZip ? ".c, .cpp, .zip" : ".c, .cpp"} (max 5MB)
                    {allowsZip ? " • ZIP must be flat (no folders)" : ""}
                    {allowsZip && expectedZipFile ? ` • ZIP must include: ${expectedZipFile}` : ""}
                  </p>
                  </>
                )}
              <input
                type="file"
                accept={acceptAttr}
                onChange={handleFileSelect}
                className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              />
            </div>

            {/* Upload error */}
            {uploadError && (
              <div className="mt-3 flex items-center gap-2 text-sm text-[var(--destructive)]">
                <AlertCircle className="w-4 h-4" />
                <span>{uploadError}</span>
              </div>
            )}

            {/* Submit button */}
            <button
              onClick={handleSubmit}
              disabled={!selectedFile || isUploading}
              className={`mt-4 w-full py-3 px-4 rounded-xl font-medium transition-all flex items-center justify-center gap-2 ${
                selectedFile && !isUploading
                  ? "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)]"
                  : "bg-[var(--muted)] text-[var(--muted-foreground)] cursor-not-allowed"
              }`}
            >
              {isUploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Uploading...</span>
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4" />
                  <span>Submit Assignment</span>
                </>
              )}
            </button>

            {latestSubmission?.late_penalty_percent !== undefined &&
              latestSubmission?.late_penalty_percent !== null &&
              latestSubmission.late_penalty_percent > 0 && (
                <p className="mt-3 text-xs text-[var(--muted-foreground)] text-center">
                  Latest submission late penalty: {latestSubmission.late_penalty_percent}% (late by{" "}
                  {formatDuration(latestSubmission.late_seconds)}).
                </p>
              )}
          </div>
        </motion.div>

        {/* Right column - Submissions */}
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-4">
              Your Submissions
            </h2>

            {submissions.length === 0 ? (
              <div className="text-center py-8">
                <FileText className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-[var(--muted-foreground)]">
                  No submissions yet
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  Upload a file to get started
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {submissions.map((submission, index) => (
                  <SubmissionCard
                    key={submission.id}
                    submission={submission}
                    isLatest={index === 0}
                    maxPoints={assignment.max_points}
                    courseId={courseId}
                    assignmentId={assignmentId}
                    attemptNumber={submissions.length - index}
                    totalAttempts={submissions.length}
                  />
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </div>
  );
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

function SubmissionCard({
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
                      {truncateOutput(testsData.compile_output)}
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
                                    {truncateOutput(t.stdout) || "∅"}
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
                                      {truncateOutput(t.stderr) || "∅"}
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
