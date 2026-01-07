"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
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
        // Get course via student API (works for staff too)
        const courseData = await student.getCourse(courseId);
        setCourse(courseData);

        // Fetch modules and assignments
        const [modulesData, assignmentsData] = await Promise.all([
          student.getModules(courseId),
          student.getAssignments(courseId),
        ]);
        setModules(modulesData);
        setAssignments(assignmentsData);

        // Fetch roster (staff API)
        try {
          const rosterData = await courseStaff.listMemberships(courseId);
          setMemberships(rosterData);
        } catch {
          // Roster fetch might fail if user doesn't have permission
        }
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError("Course not found");
          } else if (err.status === 403) {
            setError("You don't have access to this course");
          } else {
            setError(err.detail);
          }
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

  // Stats
  const studentCount = memberships.filter((m) => m.role === "student").length;
  const staffCount = memberships.filter((m) => m.role !== "student").length;
  const upcomingAssignments = assignments.filter(
    (a) => a.due_date && new Date(a.due_date) > new Date()
  ).length;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

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
            href="/staff"
            className="inline-block mt-4 text-[var(--primary)] hover:underline"
          >
            Go to staff dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link
          href="/staff"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to dashboard</span>
        </Link>
      </motion.div>

      {/* Course Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-7 h-7 text-[var(--primary)]" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="px-2 py-0.5 text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] rounded">
                  {course.code}
                </span>
                {role && (
                  <span className="px-2 py-0.5 text-xs font-medium bg-[var(--card)] text-[var(--muted-foreground)] rounded border border-[var(--border)]">
                    {role === "owner"
                      ? "Owner"
                      : role === "co_lecturer"
                      ? "Co-Lecturer"
                      : "TA"}
                  </span>
                )}
              </div>
              <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--foreground)]">
                {course.title}
              </h1>
              {course.semester && course.year && (
                <p className="text-sm text-[var(--muted-foreground)] mt-1 flex items-center gap-1">
                  <Calendar className="w-4 h-4" />
                  {course.semester}, {course.year}
                </p>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors">
              <Settings className="w-4 h-4" />
              <span className="hidden sm:inline">Settings</span>
            </button>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6"
      >
        <motion.div
          variants={fadeInUp}
          className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <Users className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {studentCount}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">Students</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <FileText className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {assignments.length}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">
                Assignments
              </p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <FolderOpen className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {modules.length}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">Modules</p>
            </div>
          </div>
        </motion.div>

        <motion.div
          variants={fadeInUp}
          className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center">
              <Clock className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-[var(--foreground)]">
                {upcomingAssignments}
              </p>
              <p className="text-xs text-[var(--muted-foreground)]">Upcoming</p>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Tabs */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mb-6"
      >
        <div className="flex gap-1 p-1 bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-x-auto">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-all ${
                activeTab === tab.id
                  ? "bg-[var(--primary)] text-white"
                  : "text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)]"
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </motion.div>

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
  const upcomingAssignments = assignments
    .filter((a) => a.due_date && new Date(a.due_date) > new Date())
    .sort(
      (a, b) =>
        new Date(a.due_date!).getTime() - new Date(b.due_date!).getTime()
    )
    .slice(0, 5);

  return (
    <div className="grid lg:grid-cols-2 gap-6">
      {/* Quick Actions */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)] mb-4">
          Quick Actions
        </h2>
        <div className="space-y-2">
          <button className="w-full flex items-center gap-3 p-3 bg-[var(--background)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <Plus className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Create Assignment
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 bg-[var(--background)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <Upload className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Import Roster (CSV)
            </span>
          </button>
          <button className="w-full flex items-center gap-3 p-3 bg-[var(--background)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left">
            <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
              <FolderOpen className="w-4 h-4 text-[var(--primary)]" />
            </div>
            <span className="text-sm font-medium text-[var(--foreground)]">
              Add Module
            </span>
          </button>
        </div>
      </div>

      {/* Upcoming Deadlines */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
        <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)] mb-4">
          Upcoming Deadlines
        </h2>
        {upcomingAssignments.length === 0 ? (
          <p className="text-sm text-[var(--muted-foreground)] text-center py-4">
            No upcoming assignments
          </p>
        ) : (
          <div className="space-y-2">
            {upcomingAssignments.map((assignment) => (
              <div
                key={assignment.id}
                className="flex items-center gap-3 p-3 bg-[var(--background)] rounded-xl"
              >
                <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center">
                  <Clock className="w-4 h-4 text-amber-600" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {assignment.title}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Due{" "}
                    {new Date(assignment.due_date!).toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Course Description */}
      {course.description && (
        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-6">
          <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)] mb-2">
            Description
          </h2>
          <p className="text-[var(--muted-foreground)]">{course.description}</p>
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
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-1">
            Course Submissions
          </h2>
          <p className="text-sm text-[var(--muted-foreground)]">
            Filter, grade, and download — without leaving the course context.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => fetchQueue(true)}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
          >
            {isRefreshing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            Refresh
          </button>
          <button
            onClick={goNextUngraded}
            disabled={isNavigatingNext || statusFilter === "graded"}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            {isNavigatingNext ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />}
            Next ungraded
          </button>
          <Link
            href="/staff/submissions"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors"
          >
            Open full queue
            <ChevronRight className="w-4 h-4" />
          </Link>
        </div>
      </div>

      <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
        <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
          Status
        </label>
        <div className="relative max-w-sm">
          <Filter className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
          <select
            value={statusFilter}
            onChange={(e) =>
              setStatusFilter(e.target.value === "all" ? "all" : (e.target.value as StaffSubmissionQueueItem["status"]))
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

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
                Missing submissions
              </h3>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Who hasn&apos;t submitted yet for each assignment.
              </p>
            </div>
            <button
              onClick={fetchMissingSummary}
              className="p-2 rounded-lg border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors"
              aria-label="Refresh missing submissions"
              title="Refresh"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>

          {missingError && (
            <div className="mt-3 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
              {missingError}
            </div>
          )}

          <div className="mt-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Assignment
            </label>
            <select
              value={missingAssignmentId ?? ""}
              onChange={(e) => setMissingAssignmentId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="">Select an assignment</option>
              {missingSummary.map((a) => (
                <option key={a.assignment_id} value={a.assignment_id}>
                  {a.assignment_title} — {a.missing_count}/{a.total_students} missing
                </option>
              ))}
            </select>
          </div>

          {missingAssignmentId !== null && (
            <div className="mt-4 space-y-2">
              {(() => {
                const active = missingSummary.find((s) => s.assignment_id === missingAssignmentId);
                if (!active) return null;
                return (
                  <div className="grid grid-cols-3 gap-2">
                    <div className="p-3 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                      <p className="text-[var(--foreground)] font-semibold">{active.total_students}</p>
                      <p className="text-xs text-[var(--muted-foreground)]">Enrolled</p>
                    </div>
                    <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                      <p className="text-emerald-800 font-semibold">{active.submitted_count}</p>
                      <p className="text-xs text-emerald-800/80">Submitted</p>
                    </div>
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20">
                      <p className="text-amber-800 font-semibold">{active.missing_count}</p>
                      <p className="text-xs text-amber-800/80">Missing</p>
                    </div>
                  </div>
                );
              })()}
            </div>
          )}
        </div>

        <div className="lg:col-span-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <UserX className="w-4 h-4 text-[var(--muted-foreground)]" />
              <p className="text-sm font-medium text-[var(--foreground)]">Students missing</p>
            </div>
            <button
              onClick={copyMissingEmails}
              disabled={missingStudents.length === 0}
              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors text-xs"
            >
              <Copy className="w-4 h-4" />
              Copy emails
            </button>
          </div>

          {missingAssignmentId === null && (
            <div className="p-8 text-center text-[var(--muted-foreground)]">
              Select an assignment to see who is missing.
            </div>
          )}

          {missingAssignmentId !== null && isMissingLoading && (
            <div className="p-8 flex items-center justify-center">
              <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
            </div>
          )}

          {missingAssignmentId !== null && !isMissingLoading && missingStudents.length === 0 && (
            <div className="p-8 text-center">
              <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
                <UserX className="w-7 h-7 text-[var(--muted-foreground)]" />
              </div>
              <p className="text-[var(--foreground)] font-medium mb-1">No one is missing</p>
              <p className="text-sm text-[var(--muted-foreground)]">Everyone submitted for this assignment.</p>
            </div>
          )}

          {missingAssignmentId !== null && !isMissingLoading && missingStudents.length > 0 && (
            <div className="divide-y divide-[var(--border)] max-h-[420px] overflow-y-auto">
              {missingStudents.map((s) => (
                <div key={s.user_id} className="px-5 py-3 hover:bg-[var(--background)] transition-colors">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {s.full_name || s.email}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] truncate">{s.email}</p>
                    </div>
                    <div className="text-right">
                      {s.student_number && (
                        <p className="text-xs text-[var(--foreground)]">{s.student_number}</p>
                      )}
                      {s.programme && (
                        <p className="text-xs text-[var(--muted-foreground)]">{s.programme}</p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="w-7 h-7 text-[var(--primary)] animate-spin" />
        </div>
      )}

      {!isLoading && error && (
        <div className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl">
          <p className="text-[var(--secondary)]">{error}</p>
        </div>
      )}

      {!isLoading && !error && items.length === 0 && (
        <div className="p-10 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
          <div className="w-14 h-14 mx-auto mb-4 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
            <FileText className="w-7 h-7 text-[var(--muted-foreground)]" />
          </div>
          <p className="text-[var(--foreground)] font-medium mb-1">No submissions found</p>
          <p className="text-sm text-[var(--muted-foreground)]">Try a different status filter.</p>
        </div>
      )}

      {!isLoading && !error && items.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="flex items-center justify-between gap-4 px-5 py-3 border-b border-[var(--border)] bg-[var(--background)]">
            <div className="flex items-center gap-3">
              <label className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)] select-none">
                <input
                  type="checkbox"
                  checked={allOnPageSelected}
                  onChange={toggleSelectAllOnPage}
                  className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                />
                Select page
              </label>
              <span className="text-xs text-[var(--muted-foreground)]">
                {total === 0 ? "0" : `${offset + 1}–${offset + items.length}`} of {total}
              </span>
            </div>

            <div className="flex items-center gap-2">
              {selectedCount > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[var(--muted-foreground)]">{selectedCount} selected</span>
                  <div className="flex items-center rounded-xl border border-[var(--border)] bg-[var(--card)] overflow-hidden">
                    <button
                      onClick={() => runBulk("mark_grading")}
                      disabled={isBulkWorking}
                      className="px-3 py-2 text-xs font-medium hover:bg-[var(--background)] disabled:opacity-60"
                    >
                      Mark grading
                    </button>
                    <div className="w-px h-7 bg-[var(--border)]" />
                    <button
                      onClick={() => runBulk("mark_graded")}
                      disabled={isBulkWorking}
                      className="px-3 py-2 text-xs font-medium hover:bg-[var(--background)] disabled:opacity-60"
                    >
                      Mark graded
                    </button>
                    <div className="w-px h-7 bg-[var(--border)]" />
                    <button
                      onClick={() => runBulk("mark_pending")}
                      disabled={isBulkWorking}
                      className="px-3 py-2 text-xs font-medium hover:bg-[var(--background)] disabled:opacity-60"
                    >
                      Reset pending
                    </button>
                  </div>
                </div>
              )}

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  disabled={!canGoPrev}
                  className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Previous page"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <button
                  onClick={() => setOffset((o) => o + limit)}
                  disabled={!canGoNext}
                  className="p-2 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>

              <select
                value={limit}
                onChange={(e) => {
                  setLimit(Number(e.target.value));
                  resetPaging();
                }}
                className="px-2.5 py-2 text-xs bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                aria-label="Rows per page"
              >
                <option value={25}>25</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-12 gap-0 px-5 py-3 border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <div className="col-span-1" />
            <div className="col-span-5">Student / Assignment</div>
            <div className="col-span-3">File</div>
            <div className="col-span-2">Submitted</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {items.map((s) => (
              <div
                key={s.id}
                onClick={() => router.push(`/staff/submissions/${s.id}`)}
                className="group grid grid-cols-12 gap-0 px-5 py-4 hover:bg-[var(--background)] transition-colors cursor-pointer"
              >
                <div className="col-span-1 flex items-center">
                  <input
                    type="checkbox"
                    checked={selectedIds.has(s.id)}
                    onClick={(e) => e.stopPropagation()}
                    onChange={() => toggleSelect(s.id)}
                    className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
                    aria-label={`Select submission ${s.id}`}
                  />
                </div>

                <div className="col-span-5 min-w-0">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {s.student_full_name || s.student_email}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {s.assignment_title}
                  </p>
                </div>

                <div className="col-span-3 min-w-0">
                  <p className="text-sm text-[var(--foreground)] truncate">{s.file_name}</p>
                  {s.score !== null && (
                    <p className="text-xs text-[var(--muted-foreground)]">
                      {s.score} / {s.max_points}
                    </p>
                  )}
                </div>

                <div className="col-span-2">
                  <p className="text-sm text-[var(--foreground)]">
                    {new Date(s.submitted_at).toLocaleDateString("en-US", { month: "short", day: "numeric" })}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {new Date(s.submitted_at).toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
                  </p>
                </div>

                <div className="col-span-1 flex items-center justify-end gap-2">
                  <span
                    className={`inline-flex items-center px-2.5 py-1 rounded-full border text-xs font-medium ${submissionStatusBadge[s.status].className}`}
                  >
                    {submissionStatusBadge[s.status].label}
                  </span>
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] transition-colors" />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

// Roster Tab
interface RosterTabProps {
  course: Course;
  memberships: CourseMembership[];
  onRefresh: () => Promise<void>;
}

function RosterTab({ course, memberships, onRefresh }: RosterTabProps) {
  const students = memberships.filter((m) => m.role === "student");
  const staffMembers = memberships.filter((m) => m.role !== "student");

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    co_lecturer: "Co-Lecturer",
    ta: "TA",
    student: "Student",
  };

  return (
    <div className="space-y-6">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--muted-foreground)]">
          {memberships.length} members in this course
        </p>
        <div className="flex items-center gap-2">
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-lg text-[var(--foreground)] hover:bg-[var(--background)] transition-colors">
            <Upload className="w-4 h-4" />
            <span>Import CSV</span>
          </button>
          <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors">
            <Plus className="w-4 h-4" />
            <span>Add Member</span>
          </button>
        </div>
      </div>

      {/* Staff Section */}
      {staffMembers.length > 0 && (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-4 bg-[var(--background)] border-b border-[var(--border)]">
            <h3 className="font-medium text-[var(--foreground)]">
              Staff ({staffMembers.length})
            </h3>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {staffMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    User #{member.user_id}
                  </p>
                  <p className="text-sm text-[var(--muted-foreground)]">
                    {roleLabels[member.role]}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Students Section */}
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[var(--background)] border-b border-[var(--border)]">
          <h3 className="font-medium text-[var(--foreground)]">
            Students ({students.length})
          </h3>
        </div>
        {students.length === 0 ? (
          <div className="p-8 text-center">
            <Users className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
            <p className="text-[var(--muted-foreground)]">
              No students enrolled yet
            </p>
            <p className="text-sm text-[var(--muted-foreground)] mt-1">
              Import a CSV roster or add students manually
            </p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {students.map((member) => (
              <div
                key={member.id}
                className="flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
              >
                <div className="w-10 h-10 rounded-full bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
                  <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    User #{member.user_id}
                  </p>
                  {member.student_number && (
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {member.student_number}
                    </p>
                  )}
                </div>
                <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors">
                  <MoreVertical className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

// Assignments Tab
interface AssignmentsTabProps {
  course: Course;
  assignments: Assignment[];
  modules: Module[];
}

function AssignmentsTab({ course, assignments, modules }: AssignmentsTabProps) {
  const getModuleName = (moduleId: number) => {
    const module = modules.find((m) => m.id === moduleId);
    return module?.title || "Unknown Module";
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--muted-foreground)]">
          {assignments.length} assignments
        </p>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {/* Assignments List */}
      {assignments.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <FileText className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)]">No assignments yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create your first assignment to get started
          </p>
        </div>
      ) : (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
          {assignments.map((assignment) => {
            const dueDate = assignment.due_date
              ? new Date(assignment.due_date)
              : null;
            const isPastDue = dueDate && dueDate < new Date();

            return (
              <div
                key={assignment.id}
                className="flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
              >
                <div
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${
                    isPastDue ? "bg-[var(--muted-foreground)]/10" : "bg-[var(--primary)]/10"
                  }`}
                >
                  <FileText
                    className={`w-5 h-5 ${
                      isPastDue ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]"
                    }`}
                  />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-[var(--foreground)]">
                    {assignment.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1">
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {getModuleName(assignment.module_id)}
                    </span>
                    {dueDate && (
                      <span
                        className={`text-xs ${
                          isPastDue
                            ? "text-[var(--muted-foreground)]"
                            : "text-[var(--muted-foreground)]"
                        }`}
                      >
                        {isPastDue ? "Closed " : "Due "}
                        {dueDate.toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    )}
                    <span className="text-xs text-[var(--muted-foreground)]">
                      {assignment.max_points} pts
                    </span>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors">
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button className="p-2 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

// Modules Tab with Resources Management
interface ModulesTabProps {
  course: Course;
  modules: Module[];
}

function ModulesTab({ course, modules }: ModulesTabProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());

  const toggleModule = (moduleId: number) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(moduleId)) {
        next.delete(moduleId);
      } else {
        next.add(moduleId);
      }
      return next;
    });
  };

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--muted-foreground)]">{modules.length} modules</p>
        <button className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors">
          <Plus className="w-4 h-4" />
          <span>Add Module</span>
        </button>
      </div>

      {/* Modules List */}
      {modules.length === 0 ? (
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
          <FolderOpen className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
          <p className="text-[var(--muted-foreground)]">No modules yet</p>
          <p className="text-sm text-[var(--muted-foreground)] mt-1">
            Create modules to organize your course content
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {modules
            .sort((a, b) => a.position - b.position)
            .map((module) => (
              <ModuleCard
                key={module.id}
                courseId={course.id}
                module={module}
                isExpanded={expandedModules.has(module.id)}
                onToggle={() => toggleModule(module.id)}
              />
            ))}
        </div>
      )}
    </div>
  );
}

// Module Card with expandable resources section
interface ModuleCardProps {
  courseId: number;
  module: Module;
  isExpanded: boolean;
  onToggle: () => void;
}

function ModuleCard({ courseId, module, isExpanded, onToggle }: ModuleCardProps) {
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState<"link" | "file" | null>(null);

  // Fetch resources when expanded
  useEffect(() => {
    if (isExpanded && resources.length === 0) {
      fetchResources();
    }
  }, [isExpanded]);

  async function fetchResources() {
    setIsLoading(true);
    setError("");
    try {
      const data = await courseStaff.listModuleResources(courseId, module.id);
      setResources(data.sort((a, b) => a.position - b.position));
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to load resources");
      }
    } finally {
      setIsLoading(false);
    }
  }

  async function handleTogglePublish(resource: ModuleResource) {
    try {
      const updated = await courseStaff.updateModuleResource(
        courseId,
        module.id,
        resource.id,
        { is_published: !resource.is_published }
      );
      setResources((prev) =>
        prev.map((r) => (r.id === resource.id ? updated : r))
      );
    } catch (err) {
      console.error("Failed to toggle publish:", err);
    }
  }

  async function handleDeleteResource(resourceId: number) {
    if (!confirm("Are you sure you want to delete this resource?")) return;
    try {
      await courseStaff.deleteModuleResource(courseId, module.id, resourceId);
      setResources((prev) => prev.filter((r) => r.id !== resourceId));
    } catch (err) {
      console.error("Failed to delete resource:", err);
    }
  }

  async function handleDownload(resource: ModuleResource) {
    try {
      const blob = await courseStaff.downloadModuleResource(
        courseId,
        module.id,
        resource.id
      );
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.file_name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Failed to download:", err);
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="bg-[var(--card)] border border-[var(--border)] rounded-xl overflow-hidden">
      {/* Module Header */}
      <div
        className="flex items-center gap-4 p-4 cursor-pointer hover:bg-[var(--background)] transition-colors"
        onClick={onToggle}
      >
        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <span className="text-sm font-semibold text-[var(--primary)]">
            {module.position}
          </span>
        </div>
        <div className="flex-1 min-w-0">
          <p className="font-medium text-[var(--foreground)]">{module.title}</p>
          {module.description && (
            <p className="text-sm text-[var(--muted-foreground)] truncate">
              {module.description}
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
            }}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          {isExpanded ? (
            <ChevronUp className="w-5 h-5 text-[var(--muted-foreground)]" />
          ) : (
            <ChevronDown className="w-5 h-5 text-[var(--muted-foreground)]" />
          )}
        </div>
      </div>

      {/* Expanded Resources Section */}
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          className="border-t border-[var(--border)]"
        >
          <div className="p-4 bg-[var(--background)]">
            <div className="flex items-center justify-between mb-3">
              <h4 className="text-sm font-medium text-[var(--foreground)]">
                Resources
              </h4>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowAddModal("link")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                >
                  <LinkIcon className="w-3.5 h-3.5" />
                  Add Link
                </button>
                <button
                  onClick={() => setShowAddModal("file")}
                  className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  Upload File
                </button>
              </div>
            </div>

            {isLoading && (
              <div className="flex items-center justify-center py-6">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
              </div>
            )}

            {error && (
              <div className="p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg text-sm text-[var(--secondary)]">
                {error}
              </div>
            )}

            {!isLoading && !error && resources.length === 0 && (
              <div className="py-6 text-center">
                <p className="text-sm text-[var(--muted-foreground)]">
                  No resources added yet
                </p>
              </div>
            )}

            {!isLoading && !error && resources.length > 0 && (
              <div className="space-y-2">
                {resources.map((resource) => (
                  <div
                    key={resource.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${
                      resource.is_published
                        ? "bg-[var(--card)] border-[var(--border)]"
                        : "bg-[var(--muted-foreground)]/5 border-dashed border-[var(--muted-foreground)]/30"
                    }`}
                  >
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                      {resource.kind === "link" ? (
                        <LinkIcon className="w-4 h-4 text-[var(--primary)]" />
                      ) : (
                        <FileText className="w-4 h-4 text-[var(--primary)]" />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[var(--foreground)] truncate">
                        {resource.title}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        {resource.kind === "link" ? (
                          <span className="text-xs text-[var(--muted-foreground)] truncate max-w-[200px]">
                            {resource.url}
                          </span>
                        ) : (
                          <span className="text-xs text-[var(--muted-foreground)]">
                            {resource.file_name} {resource.size_bytes && `(${formatFileSize(resource.size_bytes)})`}
                          </span>
                        )}
                        {!resource.is_published && (
                          <span className="px-1.5 py-0.5 text-[10px] font-medium bg-amber-500/10 text-amber-700 rounded">
                            Draft
                          </span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1">
                      {/* Publish/Unpublish */}
                      <button
                        onClick={() => handleTogglePublish(resource)}
                        className={`p-1.5 rounded-lg transition-colors ${
                          resource.is_published
                            ? "text-emerald-600 hover:bg-emerald-500/10"
                            : "text-[var(--muted-foreground)] hover:bg-[var(--background)]"
                        }`}
                        title={resource.is_published ? "Unpublish" : "Publish"}
                      >
                        {resource.is_published ? (
                          <Eye className="w-4 h-4" />
                        ) : (
                          <EyeOff className="w-4 h-4" />
                        )}
                      </button>

                      {/* Open/Download */}
                      {resource.kind === "link" ? (
                        <a
                          href={resource.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                          title="Open link"
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      ) : (
                        <button
                          onClick={() => handleDownload(resource)}
                          className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                          title="Download file"
                        >
                          <Download className="w-4 h-4" />
                        </button>
                      )}

                      {/* Delete */}
                      <button
                        onClick={() => handleDeleteResource(resource.id)}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* Add Link Modal */}
      {showAddModal === "link" && (
        <AddLinkModal
          courseId={courseId}
          moduleId={module.id}
          onClose={() => setShowAddModal(null)}
          onSuccess={(resource) => {
            setResources((prev) => [...prev, resource].sort((a, b) => a.position - b.position));
            setShowAddModal(null);
          }}
        />
      )}

      {/* Add File Modal */}
      {showAddModal === "file" && (
        <AddFileModal
          courseId={courseId}
          moduleId={module.id}
          onClose={() => setShowAddModal(null)}
          onSuccess={(resource) => {
            setResources((prev) => [...prev, resource].sort((a, b) => a.position - b.position));
            setShowAddModal(null);
          }}
        />
      )}
    </div>
  );
}

// Add Link Modal
interface AddLinkModalProps {
  courseId: number;
  moduleId: number;
  onClose: () => void;
  onSuccess: (resource: ModuleResource) => void;
}

function AddLinkModal({ courseId, moduleId, onClose, onSuccess }: AddLinkModalProps) {
  const [title, setTitle] = useState("");
  const [url, setUrl] = useState("");
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    setIsSubmitting(true);
    setError("");

    try {
      const resource = await courseStaff.createLinkResource(courseId, moduleId, {
        title: title.trim(),
        url: url.trim(),
        is_published: isPublished,
      });
      onSuccess(resource);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to add link");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
            Add Link Resource
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg text-sm text-[var(--secondary)]">
              {error}
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Course Syllabus"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              URL
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://..."
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--foreground)]">
              Publish immediately (visible to students)
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !url.trim()}
              className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              ) : (
                "Add Link"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

// Add File Modal
interface AddFileModalProps {
  courseId: number;
  moduleId: number;
  onClose: () => void;
  onSuccess: (resource: ModuleResource) => void;
}

function AddFileModal({ courseId, moduleId, onClose, onSuccess }: AddFileModalProps) {
  const [title, setTitle] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [isPublished, setIsPublished] = useState(true);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim() || !file) return;

    setIsSubmitting(true);
    setError("");

    try {
      const resource = await courseStaff.uploadFileResource(
        courseId,
        moduleId,
        file,
        title.trim(),
        undefined,
        isPublished
      );
      onSuccess(resource);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.detail);
      } else {
        setError("Failed to upload file");
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setFile(selectedFile);
      if (!title) {
        // Auto-fill title from filename
        const name = selectedFile.name.replace(/\.[^/.]+$/, ""); // Remove extension
        setTitle(name);
      }
    }
  }

  function formatFileSize(bytes: number) {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative w-full max-w-md bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b border-[var(--border)]">
          <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
            Upload File Resource
          </h3>
          <button
            onClick={onClose}
            className="p-1 text-[var(--muted-foreground)] hover:text-[var(--foreground)] rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {error && (
            <div className="p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-lg text-sm text-[var(--secondary)]">
              {error}
            </div>
          )}

          {/* File Drop Zone */}
          <div
            onClick={() => fileInputRef.current?.click()}
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${
              file
                ? "border-[var(--primary)] bg-[var(--primary)]/5"
                : "border-[var(--border)] hover:border-[var(--primary)]/50 hover:bg-[var(--background)]"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              onChange={handleFileSelect}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center gap-3">
                <FileText className="w-8 h-8 text-[var(--primary)]" />
                <div className="text-left">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate max-w-[200px]">
                    {file.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    {formatFileSize(file.size)}
                  </p>
                </div>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    setFile(null);
                  }}
                  className="p-1 text-[var(--muted-foreground)] hover:text-[var(--secondary)]"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <>
                <Upload className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
                <p className="text-sm text-[var(--foreground)]">
                  Click to select a file
                </p>
                <p className="text-xs text-[var(--muted-foreground)] mt-1">
                  PDF, DOC, TXT, ZIP, etc.
                </p>
              </>
            )}
          </div>

          <div>
            <label className="block text-sm font-medium text-[var(--foreground)] mb-1.5">
              Title
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Lecture Notes Week 1"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              required
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isPublished}
              onChange={(e) => setIsPublished(e.target.checked)}
              className="w-4 h-4 rounded border-[var(--border)] text-[var(--primary)] focus:ring-[var(--primary)]"
            />
            <span className="text-sm text-[var(--foreground)]">
              Publish immediately (visible to students)
            </span>
          </label>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] hover:bg-[var(--card)] transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim() || !file}
              className="flex-1 px-4 py-2.5 bg-[var(--primary)] text-white rounded-xl hover:bg-[var(--primary)]/90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 mx-auto animate-spin" />
              ) : (
                "Upload File"
              )}
            </button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}
