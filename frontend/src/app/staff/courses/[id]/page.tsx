"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Users,
  FileText,
  FolderOpen,
  Plus,
  Settings,
  Upload,
  Loader2,
  AlertCircle,
  Calendar,
  Clock,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  Filter,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
  Copy,
  UserX,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Eye,
  EyeOff,
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
  student,
  courseStaff,
  staffSubmissions,
  type StaffSubmissionQueueItem,
  type MissingSubmissionsSummaryItem,
  type MissingStudentOut,
  type Course,
  type Module,
  type Assignment,
  type CourseMembership,
  type ModuleResource,
  ApiError,
} from "@/lib/api";
import { useAuthStore, getCourseRole } from "@/lib/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataList } from "@/components/shared/DataList";

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

type TabType = "overview" | "submissions" | "roster" | "assignments" | "modules";

export default function StaffCoursePage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);
  const { user } = useAuthStore();

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [memberships, setMemberships] = useState<CourseMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<TabType>("overview");

  const role = getCourseRole(user, courseId);

  useEffect(() => {
    async function fetchCourseData() {
      if (!courseId || isNaN(courseId)) {
        setError("Invalid course ID");
        setIsLoading(false);
        return;
      }

      try {
        const courseData = await student.getCourse(courseId);
        setCourse(courseData);

        const [modulesData, assignmentsData] = await Promise.all([
          student.getModules(courseId),
          student.getAssignments(courseId),
        ]);
        setModules(modulesData);
        setAssignments(assignmentsData);

        try {
          const rosterData = await courseStaff.listMemberships(courseId);
          setMemberships(rosterData);
        } catch {
          // Roster fetch might fail if user doesn't have permission
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) setError("Course not found");
          else if (err.status === 403) setError("You don't have access to this course");
          else setError(err.detail);
        } else {
          setError("Failed to load course data");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourseData();
  }, [courseId]);

  const tabs: { id: TabType; label: string; icon: typeof BookOpen }[] = [       
    { id: "overview", label: "Overview", icon: BookOpen },
    { id: "submissions", label: "Submissions", icon: FileText },
    { id: "roster", label: "Roster", icon: Users },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "modules", label: "Modules", icon: FolderOpen },
  ];

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
        icon={AlertCircle}
        title="Error"
        description={error}
        action={
          <Link
            href="/staff"
            className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
        }
      />
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-sm text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dashboard</span>
        </Link>

        <PageHeader
          title={course.title}
          description={`${course.code} • ${course.semester && course.year ? `${course.semester}, ${course.year}` : "No term set"}`}
          action={
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--foreground)] hover:bg-[var(--background)] transition-colors">
              <Settings className="w-4 h-4" />
              <span>Settings</span>
            </button>
          }
        />
      </div>

      {/* Tabs */}
      <div className="border-b border-[var(--border)]">
        <div className="flex gap-6 overflow-x-auto pb-px">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 ${
                activeTab === tab.id
                  ? "border-[var(--primary)] text-[var(--primary)]"
                  : "border-transparent text-[var(--muted-foreground)] hover:text-[var(--foreground)]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <motion.div
        key={activeTab}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {activeTab === "overview" && (
          <OverviewTab
            course={course}
            modules={modules}
            assignments={assignments}
            memberships={memberships}
          />
        )}
        {activeTab === "submissions" && (
          <CourseSubmissionsTab courseId={courseId} />
        )}
        {activeTab === "roster" && (
          <RosterTab
            course={course}
            memberships={memberships}
            onRefresh={async () => {
              const data = await courseStaff.listMemberships(courseId);
              setMemberships(data);
            }}
          />
        )}
        {activeTab === "assignments" && (
          <AssignmentsTab
            course={course}
            assignments={assignments}
            modules={modules}
          />
        )}
        {activeTab === "modules" && (
          <ModulesTab course={course} modules={modules} />
        )}
      </motion.div>
    </div>
  );
}

// Overview Tab
interface OverviewTabProps {
  course: Course;
  modules: Module[];
  assignments: Assignment[];
  memberships: CourseMembership[];
}

function OverviewTab({
  course,
  modules,
  assignments,
  memberships,
}: OverviewTabProps) {
  const studentCount = memberships.filter((m) => m.role === "student").length;
  const upcomingAssignments = assignments
    .filter((a) => a.due_date && new Date(a.due_date) > new Date())
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )
    .slice(0, 5);

  const stats = [
    { label: "Students", value: studentCount, icon: Users, color: "var(--primary)" },
    { label: "Assignments", value: assignments.length, icon: FileText, color: "var(--secondary)" },
    { label: "Modules", value: modules.length, icon: FolderOpen, color: "var(--primary)" },
    { label: "Upcoming", value: upcomingAssignments.length, icon: Clock, color: "#f59e0b" },
  ];

  return (
    <div className="space-y-8">
      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeInUp}
            className="p-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl relative overflow-hidden group"
          >
            <div className="absolute right-2 top-2 opacity-[0.05] group-hover:opacity-[0.1] transition-opacity">
              <stat.icon size={64} />
            </div>
            <div className="flex items-center gap-3 mb-2">
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center"
                style={{ backgroundColor: `color-mix(in srgb, ${stat.color} 10%, transparent)` }}
              >
                <stat.icon className="w-4 h-4" style={{ color: stat.color }} />
              </div>
              <span className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider">
                {stat.label}
              </span>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)] font-[family-name:var(--font-display)]">
              {stat.value}
            </p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Quick Actions */}
        <div className="lg:col-span-1 space-y-4">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
            Quick Actions
          </h3>
          <div className="grid gap-3">
            <button className="w-full flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Create Assignment
              </span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Import Roster
              </span>
            </button>
            <button className="w-full flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left group">
              <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                <FolderOpen className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Add Module
              </span>
            </button>
          </div>
        </div>

        {/* Upcoming Deadlines */}
        <div className="lg:col-span-2 space-y-4">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
            Upcoming Deadlines
          </h3>
          {upcomingAssignments.length === 0 ? (
            <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
              <p className="text-sm text-[var(--muted-foreground)]">No upcoming assignments due.</p>
            </div>
          ) : (
            <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl divide-y divide-[var(--border)] overflow-hidden">
              {upcomingAssignments.map((assignment) => (
                <div key={assignment.id} className="p-4 flex items-center gap-4 hover:bg-[var(--background)] transition-colors">
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">
                      {assignment.title}
                    </p>
                    <p className="text-xs text-[var(--muted-foreground)]">
                      Due {new Date(assignment.due_date!).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  </div>
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {course.description && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-2">
            About this Course
          </h3>
          <p className="text-sm text-[var(--muted-foreground)] leading-relaxed">{course.description}</p>
        </div>
      )}
    </div>
  );
}

// Submissions Tab (per-course)
interface CourseSubmissionsTabProps {
  courseId: number;
}

const submissionStatusBadge: Record<
  StaffSubmissionQueueItem["status"],
  { label: string; className: string }
> = {
  pending: { label: "Pending", className: "bg-amber-500/10 text-amber-700 border-amber-500/20" },
  grading: { label: "Grading", className: "bg-blue-500/10 text-blue-700 border-blue-500/20" },
  graded: { label: "Graded", className: "bg-emerald-500/10 text-emerald-700 border-emerald-500/20" },
  error: { label: "Error", className: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20" },
};

function CourseSubmissionsTab({ courseId }: CourseSubmissionsTabProps) {
  const router = useRouter();
  const [items, setItems] = useState<StaffSubmissionQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StaffSubmissionQueueItem["status"] | "all">("pending");
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(25);
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isBulkWorking, setIsBulkWorking] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const [error, setError] = useState("");

  const [missingSummary, setMissingSummary] = useState<MissingSubmissionsSummaryItem[]>([]);
  const [missingAssignmentId, setMissingAssignmentId] = useState<number | null>(null);
  const [missingStudents, setMissingStudents] = useState<MissingStudentOut[]>([]);
  const [isMissingLoading, setIsMissingLoading] = useState(false);
  const [missingError, setMissingError] = useState("");

  const selectedCount = selectedIds.size;
  const allOnPageSelected = items.length > 0 && items.every((i) => selectedIds.has(i.id));
  const canGoPrev = offset > 0;
  const canGoNext = offset + items.length < total;

  function resetPaging() {
    setOffset(0);
    setSelectedIds(new Set());
  }

  function toggleSelect(id: number) {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleSelectAllOnPage() {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allOnPageSelected) {
        for (const item of items) next.delete(item.id);
      } else {
        for (const item of items) next.add(item.id);
      }
      return next;
    });
  }

  async function runBulk(action: "mark_pending" | "mark_grading" | "mark_graded") {
    if (selectedIds.size === 0) return;
    setIsBulkWorking(true);
    try {
      await staffSubmissions.bulkUpdate({
        submission_ids: Array.from(selectedIds),
        action,
      });
      setSelectedIds(new Set());
      await fetchQueue(true);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Bulk update failed");
    } finally {
      setIsBulkWorking(false);
    }
  }

  async function goNextUngraded() {
    setIsNavigatingNext(true);
    try {
      const status = statusFilter === "all" || statusFilter === "graded" ? undefined : statusFilter;
      const res = await staffSubmissions.nextUngraded({ course_id: courseId, status });
      if (res.submission_id) {
        router.push(`/staff/submissions/${res.submission_id}`);
      } else {
        setError("No ungraded submissions match this filter.");
      }
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to find next ungraded submission");
    } finally {
      setIsNavigatingNext(false);
    }
  }

  async function fetchMissingSummary() {
    try {
      setMissingError("");
      const summary = await courseStaff.missingSubmissionsSummary(courseId);
      setMissingSummary(summary);
      const firstWithMissing = summary.find((s) => s.missing_count > 0);
      setMissingAssignmentId(firstWithMissing ? firstWithMissing.assignment_id : null);
    } catch (err) {
      if (err instanceof ApiError) setMissingError(err.detail);
      else setMissingError("Failed to load missing submissions summary");
    }
  }

  async function fetchMissingStudents(assignmentId: number) {
    setIsMissingLoading(true);
    try {
      setMissingError("");
      const students = await courseStaff.missingSubmissions(courseId, assignmentId);
      setMissingStudents(students);
    } catch (err) {
      if (err instanceof ApiError) setMissingError(err.detail);
      else setMissingError("Failed to load missing students");
    } finally {
      setIsMissingLoading(false);
    }
  }

  async function copyMissingEmails() {
    const emails = missingStudents.map((s) => s.email).join(", ");
    try {
      await navigator.clipboard.writeText(emails);
    } catch {
      // ignore
    }
  }

  async function fetchQueue(refresh = false) {
    try {
      setError("");
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      const page = await staffSubmissions.listPage({
        course_id: courseId,
        status: statusFilter === "all" ? undefined : statusFilter,
        offset,
        limit,
      });
      setItems(page.items);
      setTotal(page.total);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load submissions");
    } finally {
      refresh ? setIsRefreshing(false) : setIsLoading(false);
    }
  }

  useEffect(() => {
    fetchQueue(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId, statusFilter, offset, limit]);

  useEffect(() => {
    resetPaging();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter]);

  useEffect(() => {
    fetchMissingSummary();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [courseId]);

  useEffect(() => {
    if (missingAssignmentId !== null) {
      fetchMissingStudents(missingAssignmentId);
    } else {
      setMissingStudents([]);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [missingAssignmentId]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div className="flex-1">
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">
            Course Queue
          </h3>
          <p className="text-sm text-[var(--muted-foreground)]">
            Review submissions specific to this course.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchQueue(true)}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors text-sm"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button
            onClick={goNextUngraded}
            disabled={isNavigatingNext || statusFilter === "graded"}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm shadow-sm"
          >
            {isNavigatingNext ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Next ungraded
          </button>
          <Link
            href="/staff/submissions"
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors text-sm"
          >
            Open global queue
            <ExternalLink className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <DataList
        filter={
          <div className="relative">
            <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <select
              value={statusFilter}
              onChange={(e) =>
                setStatusFilter(e.target.value === "all" ? "all" : (e.target.value as StaffSubmissionQueueItem["status"]))
              }
              className="pl-10 pr-8 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none min-w-[140px]"
            >
              <option value="pending">Pending</option>
              <option value="grading">Grading</option>
              <option value="graded">Graded</option>
              <option value="error">Error</option>
              <option value="all">All</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
          </div>
        }
      >
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
          </div>
        ) : error ? (
          <EmptyState icon={AlertCircle} title="Error" description={error} />
        ) : items.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="No submissions found"
            description="Try changing the status filter."
          />
        ) : (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
              <div className="flex items-center gap-3">
                <label className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)] select-none cursor-pointer">
                  <input
                    type="checkbox"
                    checked={allOnPageSelected}
                    onChange={toggleSelectAllOnPage}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                  />
                  Select page
                </label>
                <span className="text-xs text-[var(--muted-foreground)] font-mono">
                  {total === 0 ? "0" : `${offset + 1}–${offset + items.length}`} of {total}
                </span>
              </div>

              <div className="flex items-center gap-2">
                {selectedCount > 0 && (
                  <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200">
                    <span className="text-xs text-[var(--muted-foreground)] font-medium">{selectedCount} selected</span>
                    <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden shadow-sm">
                      <button onClick={() => runBulk("mark_grading")} disabled={isBulkWorking} className="px-3 py-1.5 text-[10px] font-medium hover:bg-[var(--background)] disabled:opacity-60 transition-colors uppercase tracking-wide">Grading</button>
                      <div className="w-px h-6 bg-[var(--border)]" />
                      <button onClick={() => runBulk("mark_graded")} disabled={isBulkWorking} className="px-3 py-1.5 text-[10px] font-medium hover:bg-[var(--background)] disabled:opacity-60 transition-colors uppercase tracking-wide">Graded</button>
                      <div className="w-px h-6 bg-[var(--border)]" />
                      <button onClick={() => runBulk("mark_pending")} disabled={isBulkWorking} className="px-3 py-1.5 text-[10px] font-medium hover:bg-[var(--background)] disabled:opacity-60 transition-colors uppercase tracking-wide">Reset</button>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-1">
                  <button onClick={() => setOffset((o) => Math.max(0, o - limit))} disabled={!canGoPrev} className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setOffset((o) => o + limit)} disabled={!canGoNext} className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {items.map((s) => (
                <div key={s.id} onClick={() => router.push(`/staff/submissions/${s.id}`)} className="group grid grid-cols-12 gap-4 px-5 py-4 hover:bg-[var(--background)] transition-colors cursor-pointer items-center">
                  <div className="col-span-1 flex items-center">
                    <input type="checkbox" checked={selectedIds.has(s.id)} onClick={(e) => e.stopPropagation()} onChange={() => toggleSelect(s.id)} className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)] cursor-pointer" />
                  </div>
                  <div className="col-span-5 min-w-0">
                    <p className="text-sm font-medium text-[var(--foreground)] truncate">{s.student_full_name || s.student_email}</p>
                    <p className="text-xs text-[var(--muted-foreground)] truncate mt-0.5">{s.assignment_title}</p>
                  </div>
                  <div className="col-span-3 min-w-0">
                    <p className="text-xs text-[var(--foreground)] truncate font-mono">{s.file_name}</p>
                    {s.score !== null && <p className="text-xs text-[var(--muted-foreground)]">{s.score} / {s.max_points} pts</p>}
                  </div>
                  <div className="col-span-2">
                    <p className="text-xs text-[var(--foreground)]">{new Date(s.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}</p>
                    <p className="text-[10px] text-[var(--muted-foreground)] font-mono mt-0.5">{new Date(s.submitted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}</p>
                  </div>
                  <div className="col-span-1 flex items-center justify-end gap-2">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md border text-[10px] font-bold uppercase tracking-wide ${submissionStatusBadge[s.status].className}`}>{submissionStatusBadge[s.status].label}</span>
                    <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] opacity-0 group-hover:opacity-100 transition-all" />
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </DataList>

      {/* Missing Submissions Section */}
      <div className="grid lg:grid-cols-3 gap-6 pt-6 border-t border-[var(--border)]">
        <div className="lg:col-span-1 p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)]">Missing Work</h3>
            <button onClick={fetchMissingSummary} className="p-2 rounded-lg hover:bg-[var(--background)] transition-colors"><RefreshCw className="w-4 h-4" /></button>
          </div>
          {missingError && <p className="text-xs text-[var(--secondary)] mb-4">{missingError}</p>}
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Assignment</label>
              <select value={missingAssignmentId ?? ""} onChange={(e) => setMissingAssignmentId(e.target.value ? Number(e.target.value) : null)} className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-[var(--primary)]">
                <option value="">Select assignment...</option>
                {missingSummary.map((a) => (
                  <option key={a.assignment_id} value={a.assignment_id}>{a.assignment_title} ({a.missing_count} missing)</option>
                ))}
              </select>
            </div>
            {missingAssignmentId !== null && (() => {
              const active = missingSummary.find((s) => s.assignment_id === missingAssignmentId);
              if (!active) return null;
              return (
                <div className="grid grid-cols-3 gap-2 text-center">
                  <div className="p-2 bg-[var(--background)] rounded-lg border border-[var(--border)]"><p className="font-bold">{active.total_students}</p><p className="text-[10px] text-[var(--muted-foreground)] uppercase">Total</p></div>
                  <div className="p-2 bg-emerald-500/10 rounded-lg border border-emerald-500/20"><p className="font-bold text-emerald-700">{active.submitted_count}</p><p className="text-[10px] text-emerald-700/70 uppercase">Done</p></div>
                  <div className="p-2 bg-amber-500/10 rounded-lg border border-amber-500/20"><p className="font-bold text-amber-700">{active.missing_count}</p><p className="text-[10px] text-amber-700/70 uppercase">Missing</p></div>
                </div>
              );
            })()}
          </div>
        </div>

        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden flex flex-col">
          <div className="px-6 py-4 border-b border-[var(--border)] flex items-center justify-between bg-[var(--background)]">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-[var(--muted-foreground)]" />
              <h4 className="font-medium text-sm text-[var(--foreground)]">Missing Students</h4>
            </div>
            <button onClick={copyMissingEmails} disabled={missingStudents.length === 0} className="text-xs font-medium text-[var(--primary)] hover:underline disabled:opacity-50">Copy Emails</button>
          </div>
          <div className="flex-1 overflow-y-auto max-h-[300px]">
            {missingAssignmentId === null ? (
              <div className="p-8 text-center text-[var(--muted-foreground)] text-sm">Select an assignment to view missing students.</div>
            ) : isMissingLoading ? (
              <div className="p-8 flex justify-center"><Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" /></div>
            ) : missingStudents.length === 0 ? (
              <div className="p-8 text-center">
                <p className="text-sm font-medium text-[var(--foreground)]">All good!</p>
                <p className="text-xs text-[var(--muted-foreground)]">No missing submissions for this assignment.</p>
              </div>
            ) : (
              <div className="divide-y divide-[var(--border)]">
                {missingStudents.map((s) => (
                  <div key={s.user_id} className="px-6 py-3 flex items-center justify-between hover:bg-[var(--background)] transition-colors">
                    <div>
                      <p className="text-sm font-medium text-[var(--foreground)]">{s.full_name || "Unknown Name"}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">{s.email}</p>
                    </div>
                    <div className="text-right">
                      {s.student_number && <p className="text-xs text-[var(--foreground)] font-mono">{s.student_number}</p>}
                      {s.programme && <p className="text-[10px] text-[var(--muted-foreground)]">{s.programme}</p>}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
