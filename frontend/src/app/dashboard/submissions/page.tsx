"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  Download,
  FileText,
  Filter,
  Loader2,
  RefreshCw,
} from "lucide-react";
import { ApiError, student, studentSubmissions, type Course, type StudentSubmission } from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const statusBadge: Record<
  StudentSubmission["status"],
  { label: string; className: string }
> = {
  pending: {
    label: "Pending",
    className: "bg-amber-500/10 text-amber-700 border-amber-500/20",
  },
  grading: {
    label: "Grading",
    className: "bg-blue-500/10 text-blue-700 border-blue-500/20",
  },
  graded: {
    label: "Graded",
    className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  },
  error: {
    label: "Error",
    className: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20",
  },
};

export default function StudentSubmissionsPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<StudentSubmission[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">(
    "all"
  );
  const [search, setSearch] = useState("");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return items;
    return items.filter((s) =>
      `${s.course_code} ${s.course_title} ${s.assignment_title} ${s.file_name ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [items, search]);

  async function fetchData(refresh = false) {
    setError("");
    refresh ? setIsRefreshing(true) : setIsLoading(true);
    try {
      const [courseRows, submissions] = await Promise.all([
        student.getCourses(),
        studentSubmissions.list({
          course_id: selectedCourseId === "all" ? undefined : selectedCourseId,
          offset,
          limit,
        }),
      ]);
      setCourses(courseRows);
      setItems(submissions);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load submissions");
    } finally {
      refresh ? setIsRefreshing(false) : setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCourseId, offset, limit]);

  useEffect(() => {
    setOffset(0);
  }, [selectedCourseId, limit]);

  async function downloadSubmission(submission: StudentSubmission) {
    try {
      const blob = await studentSubmissions.download(submission.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = submission.file_name || "submission";
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Download failed");
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-4"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
              Submissions
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1">
              Your submission history across all courses.
            </p>
          </div>
          <button
            type="button"
            onClick={() => fetchData(true)}
            disabled={isRefreshing}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors text-sm disabled:opacity-60"
          >
            <RefreshCw className="w-4 h-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Course
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <select
                  value={selectedCourseId}
                  onChange={(e) =>
                    setSelectedCourseId(
                      e.target.value === "all" ? "all" : Number(e.target.value)
                    )
                  }
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="all">All courses</option>
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.code} - {c.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Search
              </label>
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Assignment, course, file..."
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Page size
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-end gap-1">
                <button
                  type="button"
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  disabled={offset === 0}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setOffset((o) => o + limit)}
                  disabled={items.length < limit}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
              {error}
            </div>
          ) : null}
        </div>
      </motion.div>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">
              Submissions
            </p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            {filtered.length} shown
          </span>
        </div>

        {filtered.length === 0 ? (
          <div className="p-10 text-center text-[var(--muted-foreground)]">
            No submissions found.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((s) => (
              <div
                key={s.id}
                className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3 hover:bg-[var(--background)] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <FileText className="w-5 h-5 text-[var(--primary)]" />
                </div>

                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {s.assignment_title}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {s.course_code} - {s.course_title}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">
                    {s.file_name || "submission"}
                  </p>
                </div>

                <div className="flex items-center gap-3 md:justify-end md:min-w-[240px]">
                  <div className="text-xs text-[var(--muted-foreground)]">
                    <p className="text-[var(--foreground)]">
                      {new Date(s.submitted_at).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </p>
                    <p>
                      {new Date(s.submitted_at).toLocaleTimeString("en-US", {
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>

                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${statusBadge[s.status].className}`}
                  >
                    {statusBadge[s.status].label}
                  </span>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => downloadSubmission(s)}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors text-xs"
                    >
                      <Download className="w-4 h-4" />
                      Download
                    </button>
                    <Link
                      href={`/dashboard/courses/${s.course_id}/assignments/${s.assignment_id}`}
                      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-xs"
                    >
                      View
                      <ArrowLeft className="w-4 h-4 rotate-180" />
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

