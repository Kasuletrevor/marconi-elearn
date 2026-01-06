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
} from "lucide-react";
import {
  student,
  type Assignment,
  type Submission,
  type Course,
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
    const validExtensions = [".c", ".cpp", ".h", ".hpp", ".zip"];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => fileName.endsWith(ext));     

    if (!isValid) {
      setUploadError("Please upload a C/C++ file or zip (.c, .cpp, .h, .hpp, .zip)");
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

  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
  const isPastDue = dueDate && dueDate < new Date();
  const latestSubmission = submissions[0];
  const hasGradedSubmission = submissions.some((s) => s.status === "graded");

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
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--foreground)]">
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
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
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
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
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
                    Accepts .c, .cpp, .h, .hpp files (max 1MB)
                  </p>
                </>
              )}
              <input
                type="file"
                accept=".c,.cpp,.h,.hpp"
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

            {isPastDue && (
              <p className="mt-3 text-xs text-[var(--secondary)] text-center">
                This assignment is past due. Late submissions may not be accepted.
              </p>
            )}
          </div>
        </motion.div>

        {/* Right column - Submissions */}
        <motion.div variants={fadeInUp} className="lg:col-span-2">
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
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
}

function SubmissionCard({ submission, isLatest, maxPoints }: SubmissionCardProps) {
  const config = statusConfig[submission.status];
  const StatusIcon = config.icon;
  const submittedAt = new Date(submission.submitted_at);
  const fileName = submission.file_path.split("/").pop() || "submission";

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
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] mb-1">
            <MessageSquare className="w-3 h-3" />
            <span>Feedback</span>
          </div>
          <p className="text-sm text-[var(--foreground)] whitespace-pre-wrap">
            {submission.feedback}
          </p>
        </div>
      )}
    </div>
  );
}
