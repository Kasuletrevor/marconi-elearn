"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BookOpen,
  Filter,
  Loader2,
  FileText,
  ChevronRight,
  RefreshCw,
  ChevronDown,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { courseStaff, staffSubmissions, type Course, type StaffSubmissionQueueItem, ApiError } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataList } from "@/components/shared/DataList";

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
  const router = useRouter();
  const [courses, setCourses] = useState<Course[]>([]);
  const [items, setItems] = useState<StaffSubmissionQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [selectedCourseId, setSelectedCourseId] = useState<number | "all">("all");
  const [selectedStatus, setSelectedStatus] = useState<StaffSubmissionQueueItem["status"] | "all">("pending");
  const [offset, setOffset] = useState(0);
  const limit = 25;
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [nextId, setNextId] = useState<number | null>(null);

  type CourseOption = { id: number | "all"; title: string; code: string };

  const courseOptions = useMemo(() => {
    const options: CourseOption[] = [{ id: "all", title: "All courses", code: "All" }];
    options.push(...courses.map((c) => ({ id: c.id, title: c.title, code: c.code })));
    return options;
  }, [courses]);

  const canGoPrev = offset > 0;
  const canGoNext = offset + items.length < total;

  const resetPaging = useCallback(() => {
    setOffset(0);
  }, []);

  function goNextUngraded() {
    if (nextId) {
      router.push(`/staff/submissions/${nextId}`);
    }
  }

  const fetchData = useCallback(async (refresh = false) => {
    try {
      setError("");
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);

      const [coursesData, page, nextSub] = await Promise.all([
        courseStaff.listCourses(),
        staffSubmissions.listPage({
          course_id: selectedCourseId === "all" ? undefined : selectedCourseId,
          status: selectedStatus === "all" ? undefined : selectedStatus,
          offset,
          limit,
        }),
        staffSubmissions.nextUngraded({
          course_id: selectedCourseId === "all" ? undefined : selectedCourseId,
          status: selectedStatus === "all" || selectedStatus === "graded" ? undefined : selectedStatus,
        }),
      ]);

      setCourses(coursesData);
      setItems(page.items);
      setTotal(page.total);
      setNextId(nextSub.submission_id);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load submissions");
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [limit, offset, selectedCourseId, selectedStatus]);

  useEffect(() => {
    void fetchData(false);
  }, [fetchData]);

  useEffect(() => {
    resetPaging();
  }, [selectedCourseId, selectedStatus]);

  return (
    <div className="max-w-6xl mx-auto">
      <PageHeader
        title="Submissions Queue"
        description="Triage, grade, and return feedback — fast."
        action={
          <div className="flex items-center gap-2">
            <button
              onClick={() => fetchData(true)}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors text-sm"
            >
              {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
              Refresh
            </button>
            <button
              onClick={goNextUngraded}
              disabled={!nextId}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
            >
              <ArrowRight className="w-4 h-4" />
              Next ungraded
            </button>
          </div>
        }
      />

      <DataList
        filter={
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="relative">
              <BookOpen className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value === "all" ? "all" : Number(e.target.value))}
                className="pl-10 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none min-w-[200px]"
              >
                {courseOptions.map((c) => (
                  <option key={String(c.id)} value={c.id}>
                    {c.id === "all" ? "All courses" : `${c.code} — ${c.title}`}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
            </div>

            <div className="relative">
              <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <select
                value={selectedStatus}
                onChange={(e) =>
                  setSelectedStatus(
                    e.target.value === "all" ? "all" : (e.target.value as StaffSubmissionQueueItem["status"])
                  )
                }
                className="pl-10 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none min-w-[140px]"
              >
                <option value="pending">Pending</option>
                <option value="grading">Grading</option>
                <option value="graded">Graded</option>
                <option value="error">Error</option>
                <option value="all">All Statuses</option>
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
            </div>
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          </div>
        ) : error ? (
          <EmptyState
            icon={FileText}
            title="Error"
            description={error}
          />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nothing in this queue"
            description="Try selecting a different course or status."
          />
        ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center gap-3">
                <span className="text-xs text-[var(--muted-foreground)] font-mono">
                  {total === 0 ? "0" : `${offset + 1}–${offset + items.length}`} of {total}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setOffset((o) => Math.max(0, o - limit))}
                    disabled={!canGoPrev}
                    className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Previous page"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setOffset((o) => o + limit)}
                    disabled={!canGoNext}
                    className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    aria-label="Next page"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {items.map((s) => (
                <div
                  key={s.id}
                  onClick={() => router.push(`/staff/submissions/${s.id}`)}
                  className="group grid grid-cols-12 gap-4 px-5 py-4 hover:bg-[var(--background)] transition-colors cursor-pointer items-center"
                >
                  <div className="col-span-5 min-w-0">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)]/10 transition-colors">
                        <FileText className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {s.student_full_name || s.student_email}
                        </p>
                        <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">
                          {s.assignment_title}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="col-span-3 min-w-0">
                    <p className="text-xs font-medium text-[var(--foreground)] truncate">
                      {s.course_code}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] truncate font-mono mt-0.5">
                      {s.file_name}
                    </p>
                  </div>

                  <div className="col-span-2">
                    <p className="text-xs text-[var(--foreground)]">
                      {new Date(s.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                    </p>
                    <p className="text-[10px] text-[var(--muted-foreground)] font-mono mt-0.5">
                      {new Date(s.submitted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                    </p>
                  </div>

                  <div className="col-span-2 flex items-center justify-end gap-3">
                    <span
                      className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${statusBadge[s.status].className}`}
                    >
                      {statusBadge[s.status].label}
                    </span>
                    <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all opacity-0 group-hover:opacity-100" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataList>
    </div>
  );
}
