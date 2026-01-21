"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
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
  ExternalLink,
  Download,
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
    color: "text-amber-600",
    bgColor: "bg-amber-500/10",
    icon: Clock,
  },
  grading: {
    label: "Grading",
    color: "text-blue-600",
    bgColor: "bg-blue-500/10",
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

// Capture "now" once at module load to keep render output pure/deterministic.
const NOW_MS = Date.now();

export default function AssignmentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const assignmentId = Number(params.assignmentId);

  const [course, setCourse] = useState<Course | null>(null);
  const [assignment, setAssignment] = useState<Assignment | null>(null);
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  // File upload state
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const allowsZip = Boolean(assignment?.allows_zip);
  const expectedZipFile = assignment?.expected_filename ?? null;
  const allowedExtensions = allowsZip ? [".c", ".cpp", ".zip"] : [".c", ".cpp"];
  const acceptAttr = allowedExtensions.join(",");

  const fetchData = useCallback(async () => {
    if (!courseId || isNaN(courseId) || !assignmentId || isNaN(assignmentId)) {
      setError("Invalid course or assignment ID");
      setIsLoading(false);
      return;
    }

    try {
      const [courseData, assignmentsData, submissionsData] = await Promise.all([
        student.getCourse(courseId),
        student.getAssignments(courseId),
        student.getSubmissions(courseId, assignmentId),
      ]);

      setCourse(courseData);
      const foundAssignment = assignmentsData.find((a) => a.id === assignmentId);
      if (!foundAssignment) {
        setError("Assignment not found");
        setIsLoading(false);
        return;
      }
      setAssignment(foundAssignment);
      setSubmissions(submissionsData.sort((a, b) => 
        new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime()
      ));
    } catch (err) {
      if (err instanceof ApiError) {
        if (err.status === 404) {
          setError("Assignment not found");
        } else if (err.status === 403) {
          setError("You don't have access to this assignment");
        } else {
          setError(err.detail);
        }
      } else {
        setError("Failed to load assignment data");
      }
    } finally {
      setIsLoading(false);
    }
  }, [courseId, assignmentId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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
  }, []);

  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError("");
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  }, []);

  const validateAndSetFile = (file: File) => {
    const fileName = file.name.toLowerCase();
    const isValid = allowedExtensions.some((ext) => fileName.endsWith(ext));

    if (!isValid) {
      setUploadError(`Please upload ${allowsZip ? ".c, .cpp, or .zip" : ".c or .cpp"} file`);
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setUploadError("File size must be less than 5MB");
      return;
    }

    setSelectedFile(file);
  };

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
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Fetching_Assignment_Details...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] mb-6 transition-colors font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return_To_Course</span>
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 bg-[var(--secondary)]/5 border-l-4 border-[var(--secondary)] rounded-sm"
        >
          <div className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--secondary)] uppercase mb-2">Access_Denied</div>
          <p className="text-[var(--secondary)] opacity-80 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-[var(--secondary)]/10 text-[var(--secondary)] font-bold uppercase text-xs rounded-sm hover:bg-[var(--secondary)]/20 transition-colors"
          >
            Go_To_Dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!assignment || !course) return null;

  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;   
  const isPastDue = dueDate && dueDate < new Date();
  const latestSubmission = submissions[0];
  const hasGradedSubmission = submissions.some((s) => s.status === "graded");   
  const latePolicy = resolveLatePolicy(course, assignment);
  const latePolicySummary =
    !dueDate
      ? "No deadline set."
      : latePolicy
      ? `${latePolicy.percent_per_day}% penalty per day after ${latePolicy.grace_minutes}m grace.`
      : "No late penalties configured.";

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link
          href={`/dashboard/courses/${courseId}`}
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] mb-8 transition-colors font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return_To_{course.code.replace(/\s+/g, '_')}</span>
        </Link>
      </motion.div>

      {/* Assignment Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 border-b border-[var(--border)] pb-8"
      >
        <div className="flex items-start gap-6 mb-6">
          <div
            className={`w-16 h-16 border flex items-center justify-center shrink-0 rounded-sm shadow-sm ${ 
              isPastDue ? "bg-[var(--secondary)]/5 border-[var(--secondary)]/30" : "bg-white border-[var(--border)]"
            }`}
          >
            <FileText
              className={`w-8 h-8 ${ 
                isPastDue ? "text-[var(--secondary)]" : "text-[var(--primary)]"
              }`}
            />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--primary)]/10 text-[var(--primary)] rounded-sm uppercase tracking-[0.2em] border border-[var(--primary)]/20">
                Assignment_Brief
              </span>
              <span className="h-px flex-1 bg-[var(--border)] max-w-[100px]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-[var(--foreground)] leading-tight">
              {assignment.title}
            </h1>
          </div>
        </div>

        {/* Meta info */}
        <div className="flex flex-wrap items-center gap-6 text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider">
          {dueDate && (
            <div
              className={`flex items-center gap-2 px-3 py-1.5 border rounded-sm ${ 
                isPastDue 
                  ? "bg-[var(--secondary)]/5 border-[var(--secondary)]/30 text-[var(--secondary)]" 
                  : "bg-[var(--background)] border-[var(--border)] text-[var(--muted-foreground)]"
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>
                {isPastDue ? "EXPIRED: " : "DEADLINE: "}
                {dueDate.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                  hour: "numeric",
                  minute: "2-digit",
                })}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-sm text-[var(--muted-foreground)]">
            <Award className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>VALUE: {assignment.max_points}PTS</span>
          </div>
          {hasGradedSubmission && (
            <div className="flex items-center gap-2 bg-[var(--success)]/5 border border-[var(--success)]/30 px-3 py-1.5 rounded-sm text-[var(--success)]">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>STATUS: GRADED</span>
            </div>
          )}
        </div>

        <div className="mt-6 flex items-start gap-2">
          <div className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] mt-1.5" />
          <p className="text-xs text-[var(--muted-foreground)] italic font-light">
            {latePolicySummary} Multiple submissions allowed; latest file will be archived for grading.
          </p>
        </div>
      </motion.div>

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid lg:grid-cols-[1fr,350px] gap-10"
      >
        {/* Left column - Description & Instructions */}
        <motion.div variants={fadeInUp} className="space-y-10">
          {/* Description */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
                Instructions
              </h2>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            <div className="bg-white border border-[var(--border)] rounded-sm p-8 shadow-sm relative overflow-hidden">
               {/* Decorative stamp-like marker */}
               <div className="absolute top-0 right-0 p-3 font-[family-name:var(--font-mono)] text-[8px] text-[var(--primary)]/20 uppercase tracking-tighter select-none">
                REF_SPEC_A{assignment.id}
              </div>

              {assignment.description ? (
                <div className="prose prose-sm max-w-none text-[var(--foreground)] leading-relaxed font-light">
                  <p className="whitespace-pre-wrap">{assignment.description}</p>
                </div>
              ) : (
                <p className="text-[var(--muted-foreground)] italic font-light">
                  No specific instructions were provided for this assignment.
                </p>
              )}
            </div>
          </section>

          {/* File Upload */}
          <section>
            <div className="flex items-center gap-4 mb-6">
              <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
                Submit Your Work
              </h2>
              <div className="h-px flex-1 bg-[var(--border)]" />
            </div>
            
            <div className="bg-white border border-[var(--border)] rounded-sm p-8 shadow-sm">
              {/* Drag and drop zone */}
              <div
                onDragOver={handleDragOver}
                onDragLeave={handleDragLeave}
                onDrop={handleDrop}
                className={`relative border border-dashed rounded-sm p-10 text-center transition-all duration-300 ${ 
                  isDragging
                    ? "border-[var(--primary)] bg-[var(--primary)]/5"
                    : selectedFile
                    ? "border-[var(--success)] bg-[var(--success)]/5"
                    : "border-[var(--border)] hover:border-[var(--primary)]/40 hover:bg-[var(--background)]/30"
                }`}
              >
                {selectedFile ? (
                  <div className="flex flex-col items-center justify-center gap-4">
                    <div className="w-16 h-16 border border-[var(--success)]/30 bg-[var(--success)]/5 flex items-center justify-center rounded-sm">
                      <File className="w-8 h-8 text-[var(--success)]" />
                    </div>
                    <div className="text-center">
                      <p className="font-bold text-[var(--foreground)] font-[family-name:var(--font-display)] text-lg">
                        {selectedFile.name}
                      </p>
                      <p className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase mt-1">
                        SIZE: {(selectedFile.size / 1024).toFixed(1)} KB
                      </p>
                    </div>
                    <button
                      onClick={clearFile}
                      className="inline-flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-sm transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                      Discard_File
                    </button>
                  </div>
                ) : (
                  <>
                    <div className="w-16 h-16 border border-[var(--border)] bg-[var(--background)] flex items-center justify-center rounded-sm mx-auto mb-6">
                      <Upload className="w-8 h-8 text-[var(--muted-foreground)]/60" />
                    </div>
                    <p className="text-[var(--foreground)] font-bold text-lg mb-2 font-[family-name:var(--font-display)]">
                      Ready to submit?
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)] mb-6 font-light italic">
                      Drag your solution file here or click to browse.
                    </p>
                    <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-[0.2em] space-y-1">
                      <p>Format: {allowsZip ? ".C, .CPP, .ZIP" : ".C, .CPP"}</p>
                      <p>Max_Limit: 5MB</p>
                      {allowsZip && expectedZipFile && <p>Include_In_Zip: {expectedZipFile}</p>}
                    </div>
                    </>
                  )}
                <input
                  type="file"
                  accept={acceptAttr}
                  onChange={handleFileSelect}
                  className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                  disabled={isUploading}
                />
              </div>

              {/* Upload error */}
              {uploadError && (
                <motion.div
                  initial={{ opacity: 0, y: -5 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="mt-4 p-4 bg-[var(--secondary)]/5 border-l-2 border-[var(--secondary)] flex items-center gap-3"
                >
                  <AlertCircle className="w-4 h-4 text-[var(--secondary)]" />
                  <span className="text-xs font-bold font-[family-name:var(--font-mono)] text-[var(--secondary)] uppercase">{uploadError}</span>
                </motion.div>
              )}

              {/* Submit button */}
              <button
                onClick={handleSubmit}
                disabled={!selectedFile || isUploading}
                className={`mt-8 w-full py-4 px-6 rounded-sm font-bold uppercase tracking-[0.2em] text-sm transition-all flex items-center justify-center gap-3 border shadow-sm ${ 
                  selectedFile && !isUploading
                    ? "bg-[var(--primary)] text-white border-[var(--primary)] hover:bg-[var(--primary-hover)] shadow-lg shadow-[var(--primary)]/10"
                    : "bg-[var(--muted)] text-[var(--muted-foreground)] border-[var(--border)] cursor-not-allowed"
                }`}
              >
                {isUploading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Uploading_Data...</span>
                  </>
                ) : (
                  <>
                    <Upload className="w-4 h-4" />
                    <span>Send_To_Archive</span>
                  </>
                )}
              </button>

              {latestSubmission?.late_penalty_percent !== undefined &&
                latestSubmission?.late_penalty_percent !== null &&
                latestSubmission.late_penalty_percent > 0 && (
                  <div className="mt-6 p-3 bg-amber-500/5 border border-amber-500/20 rounded-sm text-center">
                    <p className="font-[family-name:var(--font-mono)] text-[10px] text-amber-700 uppercase tracking-wider">
                      Late_Penalty: -{latestSubmission.late_penalty_percent}% // T_OFFSET: {formatDuration(latestSubmission.late_seconds)}
                    </p>
                  </div>
                )}
            </div>
          </section>
        </motion.div>

        {/* Right column - Submissions */}
        <motion.div variants={fadeInUp}>
          <div className="flex items-center gap-4 mb-6">
            <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
              History
            </h2>
            <div className="h-px flex-1 bg-[var(--border)]" />
          </div>

          <div className="bg-white border border-[var(--border)] rounded-sm p-6 shadow-sm">
            <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest mb-6 border-b border-[var(--border)] pb-2 flex justify-between">
              <span>Submission_Log</span>
              <span>Count: {submissions.length}</span>
            </div>

            {submissions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-[var(--border)] rounded-sm">
                <FileText className="w-10 h-10 text-[var(--muted-foreground)]/30 mx-auto mb-4" />
                <p className="text-[var(--muted-foreground)] font-light italic text-sm">
                  No records found in current log.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
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
      label: "COMPILE_ERROR",
      className: "bg-[var(--destructive)]/5 text-[var(--destructive)] border-[var(--destructive)]/20",
      hint: "Code failed to compile. Review output below.",
    },
    runtime_error: {
      label: "RUNTIME_ERROR",
      className: "bg-[var(--destructive)]/5 text-[var(--destructive)] border-[var(--destructive)]/20",
      hint: "Program crashed or exceeded limits.",
    },
    infra_error: {
      label: "INFRA_ERROR",
      className: "bg-amber-500/5 text-amber-700 border-amber-500/20",
      hint: "Temporary system issue. Please retry.",
    },
    internal_error: {
      label: "INTERNAL_ERROR",
      className: "bg-[var(--secondary)]/5 text-[var(--secondary)] border-[var(--secondary)]/20",
      hint: "Unexpected system behavior encountered.",
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
          setTestsError("Detailed results are not available for this record.");
        } else if (err.status === 401) {
          setTestsError("Access denied. Please re-authenticate.");
        } else {
          setTestsError(err.detail || "Error loading archival data.");
        }
      } else {
        setTestsError("Network error while retrieving results.");
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
      className={`p-5 rounded-sm border transition-all relative overflow-hidden ${ 
        isLatest
          ? "border-[var(--primary)] shadow-md bg-white"
          : "border-[var(--border)] bg-[var(--background)]/30"
      }`}
    >
      {/* Visual indicator for latest */}
      {isLatest && (
        <div className="absolute top-0 left-0 w-1 h-full bg-[var(--primary)]" />
      )}

      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex flex-col gap-1 min-w-0">
          <div className="flex items-center gap-2">
            <StatusIcon className={`w-3.5 h-3.5 ${config.color}`} />
            <span className={`font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase tracking-wider ${config.color}`}>
              {config.label.replace(/\s+/g, '_')}
            </span>
          </div>
          <span className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase tracking-tighter">
            ENTRY #{attemptNumber.toString().padStart(2, '0')} // ARCHIVE_00{attemptNumber}
          </span>
        </div>
        {isLatest && (
          <div className="font-[family-name:var(--font-mono)] text-[8px] border border-[var(--primary)]/30 text-[var(--primary)] px-1.5 py-0.5 rounded-sm uppercase tracking-[0.2em] font-bold bg-[var(--primary)]/5">
            LATEST
          </div>
        )}
      </div>

      <div className="space-y-1 mb-4">       
        <p className="text-xs font-bold text-[var(--foreground)] truncate font-[family-name:var(--font-mono)]">
          {fileName}
        </p>
        <p className="text-[10px] text-[var(--muted-foreground)] font-[family-name:var(--font-mono)] uppercase">
          STAMP: {submittedAt.toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
          })} {submittedAt.toLocaleTimeString("en-US", {
            hour: "2-digit",
            minute: "2-digit",
            hour12: false
          })}
        </p>
      </div>

      {submissionKind && (
        <div className="mb-4">
          <div className="flex flex-col gap-2">
            <span
              className={`inline-block px-2 py-1 border rounded-sm text-[9px] font-bold uppercase tracking-widest ${submissionKind.className}`}
            >
              {submissionKind.label}
            </span>
            <p className="text-[11px] text-[var(--muted-foreground)] italic font-light">
              {submissionKind.hint}
            </p>
          </div>
        </div>
      )}

      {submission.late_penalty_percent !== undefined &&
        submission.late_penalty_percent !== null &&
        submission.late_penalty_percent > 0 && (
          <div className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--secondary)] uppercase tracking-tighter mb-4 italic">
            DEDUCTION: -{submission.late_penalty_percent}% // T_LATE: {formatDuration(submission.late_seconds)}
          </div>
        )}

      {submission.status === "graded" && submission.score !== null && (   
        <div className="pt-4 border-t border-[var(--border)] border-dashed">
          <div className="flex items-end justify-between mb-2">        
            <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">VAL_OUTPUT</span>
            <span className="font-[family-name:var(--font-display)] font-bold text-2xl text-[var(--foreground)] leading-none">     
              {submission.score}<span className="text-sm text-[var(--muted-foreground)] ml-1">/ {maxPoints}</span>
            </span>
          </div>
          {/* Score bar */}
          <div className="h-1 bg-[var(--muted)] rounded-full overflow-hidden">
            <div
              className="h-full bg-[var(--primary)] transition-all duration-700"
              style={{ width: `${(submission.score / maxPoints) * 100}%` }}
            />
          </div>
        </div>
      )}

      {submission.feedback && (
        <div className="mt-4 pt-4 border-t border-[var(--border)] border-dashed">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">
              <MessageSquare className="w-3.5 h-3.5" />
              <span>OFFICIAL_REMARKS</span>
            </div>
            <button
              type="button"
              onClick={() => setIsDetailsOpen((v) => !v)}
              className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase text-[var(--primary)] hover:underline"
            >
              [{isDetailsOpen ? "CLOSE" : "OPEN"}]
            </button>
          </div>
          {isDetailsOpen && (
            <div className="mt-3 p-3 bg-white border border-[var(--border)] rounded-sm">
              <p className="text-xs text-[var(--foreground)] whitespace-pre-wrap leading-relaxed font-light italic">
                {submission.feedback}
              </p>
            </div>
          )}
        </div>
      )}

      <div className="mt-4 pt-2 border-t border-[var(--border)] border-dashed">
        <button
          type="button"
          onClick={toggleTests}
          disabled={!canShowTests}
          className={`w-full flex items-center justify-between rounded-sm px-2 py-2 transition-all ${ 
            canShowTests ? "hover:bg-white border border-transparent hover:border-[var(--border)]" : "opacity-40 cursor-not-allowed"
          }`}
        >
          <div className="flex items-center gap-2 font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-widest font-bold">
            <Beaker className="w-3.5 h-3.5" />
            <span>AUTOGRADE_REPORT</span>
            {!canShowTests && <span className="opacity-50 font-normal ml-2">// [QUEUEING]</span>}
          </div>
          {isTestsOpen ? (
            <ChevronUp className="w-4 h-4 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="w-4 h-4 text-[var(--muted-foreground)]" />
          )}
        </button>

        {isTestsOpen && (
          <div className="mt-4 space-y-4">
            <p className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase tracking-tighter italic">
              * Showing archival results for visible test vectors. Hidden vectors are withheld for integrity.
            </p>

            {isTestsLoading ? (
              <div className="flex flex-col items-center py-6 gap-3">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
                <span className="font-[family-name:var(--font-mono)] text-[9px] uppercase tracking-widest text-[var(--muted-foreground)]">Processing_Results...</span>
              </div>
            ) : testsError ? (
              <div className="p-3 bg-[var(--secondary)]/5 border border-[var(--secondary)]/20 text-[var(--secondary)] font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider rounded-sm">
                ERROR: {testsError}
              </div>
            ) : (
              <>
                {testsData?.compile_output ? (
                  <div className="mt-4">
                    <div className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase tracking-widest mb-2 font-bold flex items-center gap-2">
                       <div className="w-1 h-1 bg-[var(--primary)] rounded-full" />
                       COMPILER_STD_OUT
                    </div>
                    <pre className="text-[10px] font-[family-name:var(--font-mono)] whitespace-pre-wrap bg-[var(--background)]/80 rounded-sm p-4 border border-[var(--border)] overflow-x-auto text-[var(--foreground)] leading-tight">
                      {testsData.compile_output}
                    </pre>
                  </div>
                ) : null}

                <div className="mt-6 space-y-3">
                  {(testsData?.tests ?? []).length === 0 ? (
                    <div className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase italic py-4 border border-dashed border-[var(--border)] rounded-sm text-center">
                      NULL_VECTOR_OUTPUT
                    </div>
                  ) : (
                    (testsData?.tests ?? []).map((t) => {
                      const isExpanded = expandedTestId === t.test_case_id;
                      return (
                        <div
                          key={t.test_case_id}
                          className={`rounded-sm border transition-all ${ 
                            isExpanded ? "border-[var(--border)] bg-white shadow-sm" : "border-[var(--border)] bg-[var(--background)]/50"
                          }`}
                        >
                          <div className="p-3 flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-3">
                                <h4 className="text-sm font-bold text-[var(--foreground)] truncate font-[family-name:var(--font-display)]">
                                  {t.name}
                                </h4>
                                <span className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase border border-[var(--border)] px-1.5 py-0.5 rounded-sm">
                                  {t.points.toString().padStart(2, '0')}PTS
                                </span>
                              </div>
                              <div className="font-[family-name:var(--font-mono)] text-[8px] text-[var(--muted-foreground)] uppercase tracking-tighter mt-1">
                                VEC_POS: #{t.position.toString().padStart(3, '0')}
                              </div>
                            </div>

                            <div className="flex items-center gap-3 shrink-0 pt-1">
                              <span
                                className={`font-[family-name:var(--font-mono)] text-[9px] font-bold px-2 py-0.5 rounded-sm uppercase tracking-widest ${ 
                                  t.passed
                                    ? "bg-[var(--success)]/10 text-[var(--success)] border border-[var(--success)]/20"
                                    : "bg-[var(--secondary)]/10 text-[var(--secondary)] border border-[var(--secondary)]/20"
                                }`}
                              >
                                {t.passed ? "PASS" : "FAIL"}
                              </span>
                              <button
                                type="button"
                                onClick={() =>
                                  setExpandedTestId((prev) =>
                                    prev === t.test_case_id ? null : t.test_case_id
                                  )
                                }
                                className="font-[family-name:var(--font-mono)] text-[10px] font-bold uppercase text-[var(--primary)] hover:underline"
                              >
                                {isExpanded ? "[LESS]" : "[MORE]"}
                              </button>
                            </div>
                          </div>

                          {isExpanded && (
                            <div className="px-3 pb-3 pt-1 space-y-4 border-t border-[var(--border)] border-dashed mt-2">
                              {t.stdin ? (
                                <div>
                                  <div className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase mb-2 font-bold">INPUT_VECTOR</div>
                                  <pre className="text-[10px] font-[family-name:var(--font-mono)] whitespace-pre-wrap bg-[var(--background)] rounded-sm p-3 border border-[var(--border)] overflow-x-auto text-[var(--foreground)] leading-tight">
                                    {t.stdin}
                                  </pre>
                                </div>
                              ) : null}

                              <div className="grid md:grid-cols-2 gap-4">
                                <div>
                                  <div className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase mb-2 font-bold">EXPECTED_STD_OUT</div>
                                  <pre className="text-[10px] font-[family-name:var(--font-mono)] whitespace-pre-wrap bg-[var(--background)] rounded-sm p-3 border border-[var(--border)] overflow-x-auto text-[var(--foreground)] leading-tight">
                                    {t.expected_stdout || "∅"}
                                  </pre>
                                </div>
                                <div>
                                  <div className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase mb-2 font-bold">ACTUAL_STD_OUT</div>
                                  <pre className={`text-[10px] font-[family-name:var(--font-mono)] whitespace-pre-wrap rounded-sm p-3 border overflow-x-auto leading-tight ${ 
                                    t.passed ? "bg-[var(--success)]/5 border-[var(--success)]/20" : "bg-[var(--secondary)]/5 border-[var(--secondary)]/20"
                                  }`}>
                                    {t.stdout || "∅"}
                                  </pre>
                                </div>
                              </div>

                              {(t.expected_stderr || t.stderr) && (
                                <div className="grid md:grid-cols-2 gap-4">
                                  <div>
                                    <div className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase mb-2 font-bold">EXPECTED_STD_ERR</div>
                                    <pre className="text-[10px] font-[family-name:var(--font-mono)] whitespace-pre-wrap bg-[var(--background)] rounded-sm p-3 border border-[var(--border)] overflow-x-auto text-[var(--foreground)] leading-tight">
                                      {t.expected_stderr || "∅"}
                                    </pre>
                                  </div>
                                  <div>
                                    <div className="font-[family-name:var(--font-mono)] text-[9px] text-[var(--muted-foreground)] uppercase mb-2 font-bold">ACTUAL_STD_ERR</div>
                                    <pre className={`text-[10px] font-[family-name:var(--font-mono)] whitespace-pre-wrap rounded-sm p-3 border overflow-x-auto leading-tight ${ 
                                      t.passed ? "bg-white" : "bg-[var(--secondary)]/5 border-[var(--secondary)]/20 text-[var(--secondary)]"
                                    }`}>
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