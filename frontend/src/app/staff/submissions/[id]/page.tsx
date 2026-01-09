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
  User,
  BookOpen,
  Award,
  Calendar,
  AlertCircle,
} from "lucide-react";
import { staffSubmissions, type StaffSubmissionDetail, type StaffSubmissionUpdate, ApiError } from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

export default function StaffSubmissionDetailPage() {
  const params = useParams();
  const router = useRouter();
  const submissionId = Number(params.id);

  const [data, setData] = useState<StaffSubmissionDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [status, setStatus] = useState<StaffSubmissionDetail["status"]>("pending");
  const [score, setScore] = useState<string>("");
  const [feedback, setFeedback] = useState<string>("");
  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);

  const maxPoints = data?.max_points ?? 0;
  const submittedAt = useMemo(() => (data ? new Date(data.submitted_at) : null), [data]);

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
        setStatus(detail.status);
        setScore(detail.score === null ? "" : String(detail.score));
        setFeedback(detail.feedback ?? "");
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
    setSaveError("");
    setIsSaving(true);
    try {
      const payload: StaffSubmissionUpdate = {
        status,
        feedback: feedback.trim() === "" ? null : feedback,
      };

      if (score.trim() === "") {
        payload.score = null;
      } else {
        const parsed = Number(score);
        if (Number.isNaN(parsed)) {
          setSaveError("Score must be a number");
          setIsSaving(false);
          return;
        }
        if (parsed < 0 || parsed > maxPoints) {
          setSaveError(`Score must be between 0 and ${maxPoints}`);
          setIsSaving(false);
          return;
        }
        payload.score = parsed;
      }

      await staffSubmissions.update(data.id, payload);
      const refreshed = await staffSubmissions.get(data.id);
      setData(refreshed);
      setStatus(refreshed.status);
      setScore(refreshed.score === null ? "" : String(refreshed.score));
      setFeedback(refreshed.feedback ?? "");
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to save");
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
                  {data.course_code} — {data.course_title}
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
              disabled={isSaving}
              onClick={handleSave}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-6">
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="lg:col-span-2">
          <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
              Grade & Feedback
            </h2>

            {saveError && (
              <div className="mb-4 p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                {saveError}
              </div>
            )}

            <div className="grid md:grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Status
                </label>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as StaffSubmissionDetail["status"])}
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="pending">Pending</option>
                  <option value="grading">Grading</option>
                  <option value="graded">Graded</option>
                  <option value="error">Error</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Score (0–{maxPoints})
                </label>
                <input
                  value={score}
                  onChange={(e) => setScore(e.target.value)}
                  inputMode="numeric"
                  placeholder="e.g. 8"
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Feedback
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                rows={10}
                placeholder="Write structured feedback: correctness, style, and next steps."
                className="w-full px-3 py-3 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
              />
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
                <p className="text-[var(--foreground)]">{data.content_type || "—"}</p>
              </div>
              <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                <p className="text-xs text-[var(--muted-foreground)] mb-1">Course</p>
                <div className="flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-[var(--muted-foreground)]" />
                  <p className="text-[var(--foreground)] truncate">
                    {data.course_code} — {data.course_title}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

