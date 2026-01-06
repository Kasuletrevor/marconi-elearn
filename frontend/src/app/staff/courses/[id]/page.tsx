"use client";

import { useEffect, useState } from "react";
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
  Filter,
  RefreshCw,
  MoreVertical,
  Pencil,
  Trash2,
} from "lucide-react";
import {
  student,
  courseStaff,
  staffSubmissions,
  type StaffSubmissionQueueItem,
  type Course,
  type Module,
  type Assignment,
  type CourseMembership,
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
  const [items, setItems] = useState<StaffSubmissionQueueItem[]>([]);
  const [statusFilter, setStatusFilter] = useState<StaffSubmissionQueueItem["status"] | "all">("pending");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  async function fetchQueue(refresh = false) {
    try {
      setError("");
      refresh ? setIsRefreshing(true) : setIsLoading(true);
      const data = await staffSubmissions.listQueue({
        course_id: courseId,
        status: statusFilter === "all" ? undefined : statusFilter,
        limit: 100,
      });
      setItems(data);
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
  }, [courseId, statusFilter]);

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
          <div className="grid grid-cols-12 gap-0 px-5 py-3 border-b border-[var(--border)] text-xs text-[var(--muted-foreground)]">
            <div className="col-span-6">Student / Assignment</div>
            <div className="col-span-3">File</div>
            <div className="col-span-2">Submitted</div>
            <div className="col-span-1 text-right">Status</div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {items.map((s) => (
              <Link
                key={s.id}
                href={`/staff/submissions/${s.id}`}
                className="group grid grid-cols-12 gap-0 px-5 py-4 hover:bg-[var(--background)] transition-colors"
              >
                <div className="col-span-6 min-w-0">
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
              </Link>
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

// Modules Tab
interface ModulesTabProps {
  course: Course;
  modules: Module[];
}

function ModulesTab({ course, modules }: ModulesTabProps) {
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
              <div
                key={module.id}
                className="bg-[var(--card)] border border-[var(--border)] rounded-xl p-4 hover:border-[var(--primary)]/30 transition-colors"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                    <span className="text-sm font-semibold text-[var(--primary)]">
                      {module.position}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--foreground)]">
                      {module.title}
                    </p>
                    {module.description && (
                      <p className="text-sm text-[var(--muted-foreground)] truncate">
                        {module.description}
                      </p>
                    )}
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
              </div>
            ))}
        </div>
      )}
    </div>
  );
}
