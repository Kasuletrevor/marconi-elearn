"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Filter,
  Loader2,
  FileText,
  ChevronRight,
  Download,
  RefreshCw,
} from "lucide-react";
import { courseStaff, staffSubmissions, type Course, type StaffSubmissionQueueItem, ApiError } from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 14 },
  visible: { opacity: 1, y: 0 },
};

const statusBadge: Record<
  StaffSubmissionQueueItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  grading: { label: "Grading", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  graded: { label: "Graded", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  error: { label: "Error", className: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20" },
};

export default function StaffSubmissionsQueuePage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<StaffSubmissionQueueItem[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<StaffSubmissionQueueItem["status"] | "all">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const courseOptions = useMemo(() => {
    return [{ id: "all" as const, title: "All courses", code: "All" }].concat(
      courses.map((c) => ({ id: c.id, title: c.title, code: c.code }))
    );
  }, [courses]);

  async function fetchData(refresh = false) {
    try {
      setError("");
      refresh ? setIsRefreshing(true) : setIsLoading(true);

      const [coursesData, submissions] = await Promise.all([
        courseStaff.listCourses(),
        staffSubmissions.listQueue({
          course_id: selectedCourseId === "all" ? undefined : selectedCourseId,
          status: selectedStatus === "all" ? undefined : selectedStatus,
          limit: 100,
        }),
      ]);

      setCourses(coursesData);
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
  }, [selectedCourseId, selectedStatus]);

  return (
    <div className="max-w-6xl mx-auto">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="mb-8">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
              Submissions Queue
            </h1>
            <p className="text-[var(--muted-foreground)]">
              Triage, grade, and return feedback — fast.
            </p>
          </div>
          <button
            onClick={() => fetchData(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-6">
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <div className="flex flex-col md:flex-row md:items-end gap-4">
            <div className="flex-1">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Course
              </label>
              <div className="relative">
                <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <select
                  value={selectedCourseId}
                  onChange={(e) => setSelectedCourseId(e.target.value === "all" ? "all" : Number(e.target.value))}
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  {courseOptions.map((c) => (
                    <option key={String(c.id)} value={c.id}>
                      {c.id === "all" ? "All courses" : `${c.code} — ${c.title}`}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="md:w-64">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Status
              </label>
              <div className="relative">
                <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <select
                  value={selectedStatus}
                  onChange={(e) =>
                    setSelectedStatus(
                      e.target.value === "all" ? "all" : (e.target.value as StaffSubmissionQueueItem["status"])
                    )
                  }
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="pending">Pending</option>
                  <option value="grading">Grading</option>
                  <option value="graded">Graded</option>
                  <option value="error">Error</option>
                  <option value="all">All</option>
                </select>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
        </div>
      )}

      {!isLoading && error && (
        <div className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl">
          <p className="text-[var(--secondary)]">{error}</p>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center py-20">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
            <FileText className="w-8 h-8 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-2">
            Nothing in this queue
          </h2>
          <p className="text-[var(--muted-foreground)]">
            Try selecting a different course or status.
          </p>
        </motion.div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="grid grid-cols-12 gap-0 px-5 py-3 border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <div className="col-span-5">Student / Assignment</div>
            <div className="col-span-3">Course</div>
            <div className="col-span-2">Submitted</div>
            <div className="col-span-2 text-right">Status</div>
          </div>

          <div className="divide-y divide-[var(--border)]">
            {items.map((s) => (
              <Link
                key={s.id}
                href={`/staff/submissions/${s.id}`}
                className="group grid grid-cols-12 gap-0 px-5 py-4 hover:bg-[var(--background)] transition-colors"
              >
                <div className="col-span-5 min-w-0">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                      <FileText className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {s.student_full_name || s.student_email}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">
                        {s.assignment_title}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="col-span-3 min-w-0">
                  <p className="text-sm text-[var(--foreground)] truncate">
                    {s.course_code} — {s.course_title}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {s.file_name}
                  </p>
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-[var(--foreground)]">
                    {new Date(s.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(s.submitted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>

                <div className="col-span-2 flex items-center justify-end gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${statusBadge[s.status].className}`}
                  >
                    {statusBadge[s.status].label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                </div>
              </Link>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
}

