"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowLeft,
  ArrowUp,
  ArrowDown,
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
  Save,
  Trash2,
  Copy,
  UserX,
  Link as LinkIcon,
  Download,
  ExternalLink,
  Beaker,
  Eye,
  EyeOff,
  GripVertical,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import {
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
  type OrgMembership,
  type CourseMembershipCreate,
  type CourseMembershipUpdate,
  type CourseUpdate,
  type LatePolicy,
  ApiError,
} from "@/lib/api";
import { useAuthStore, getCourseRole } from "@/lib/store";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataList } from "@/components/shared/DataList";
import { ConfirmModal } from "@/components/ui/Modal";
import { reportError } from "@/lib/reportError";
import { PROGRAMMES, type Programme } from "@/lib/programmes";

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
  const [showSettingsModal, setShowSettingsModal] = useState(false);
  const [openCreateAssignmentFromQuickAction, setOpenCreateAssignmentFromQuickAction] =
    useState(false);
  const [openCreateModuleFromQuickAction, setOpenCreateModuleFromQuickAction] =
    useState(false);
  const [openImportRosterFromQuickAction, setOpenImportRosterFromQuickAction] =
    useState(false);

  const role = getCourseRole(user, courseId);
  const canEditCourseSettings = role === "owner" || role === "co_lecturer";     

  useEffect(() => {
    async function fetchCourseData() {
      if (!courseId || isNaN(courseId)) {
        setError("Invalid course ID");
        setIsLoading(false);
        return;
      }

      try {
        const courseData = await courseStaff.getCourse(courseId);
        setCourse(courseData);

        const [modulesData, assignmentsData] = await Promise.all([
          courseStaff.listModules(courseId),
          courseStaff.listAssignments(courseId),
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
            <button
              onClick={() => setShowSettingsModal(true)}
              disabled={!canEditCourseSettings}
              title={
                canEditCourseSettings
                  ? "Course settings"
                  : "Only instructors (owner/co-lecturer) can edit settings"
              }
              className={`flex items-center gap-2 px-4 py-2 bg-[var(--card)] border border-[var(--border)] rounded-xl text-sm font-medium text-[var(--foreground)] transition-colors ${
                canEditCourseSettings
                  ? "hover:bg-[var(--card)]/60"
                  : "opacity-60 cursor-not-allowed"
              }`}
            >
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
              className={`flex items-center gap-2 pb-3 text-sm font-medium transition-colors border-b-2 ${activeTab === tab.id
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
            onQuickAction={(action) => {
              switch (action) {
                case "create_assignment":
                  setActiveTab("assignments");
                  setOpenCreateAssignmentFromQuickAction(true);
                  break;
                case "import_roster":
                  setActiveTab("roster");
                  setOpenImportRosterFromQuickAction(true);
                  break;
                case "add_module":
                  setActiveTab("modules");
                  setOpenCreateModuleFromQuickAction(true);
                  break;
              }
            }}
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
            focusImportCsvOnMount={openImportRosterFromQuickAction}
            onConsumedFocusImportCsv={() => setOpenImportRosterFromQuickAction(false)}
          />
        )}
        {activeTab === "assignments" && (
          <AssignmentsTab
            course={course}
            assignments={assignments}
            modules={modules}
            onRefreshAssignments={async () => {
              const data = await courseStaff.listAssignments(courseId);    
              setAssignments(data);
            }}
            openCreateOnMount={openCreateAssignmentFromQuickAction}
            onConsumedOpenCreate={() => setOpenCreateAssignmentFromQuickAction(false)}
          />
        )}
        {activeTab === "modules" && (
          <ModulesTab
            course={course}
            modules={modules}
            onRefreshModules={async () => {
              const data = await courseStaff.listModules(courseId);        
              setModules(data);
            }}
            openCreateOnMount={openCreateModuleFromQuickAction}
            onConsumedOpenCreate={() => setOpenCreateModuleFromQuickAction(false)}
          />
        )}
      </motion.div>

      <AnimatePresence>
        {showSettingsModal && (
          <CourseSettingsModal
            course={course}
            onClose={() => setShowSettingsModal(false)}
            onUpdated={(updated) => setCourse(updated)}
            onSaved={(updated) => {
              setCourse(updated);
              setShowSettingsModal(false);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function normalizeLatePolicy(policy: Course["late_policy"]): LatePolicy {
  const p = policy ?? null;
  return {
    enabled: p?.enabled ?? true,
    type: "percent_per_day",
    grace_minutes: Number(p?.grace_minutes ?? 0) || 0,
    percent_per_day: Number(p?.percent_per_day ?? 0) || 0,
    max_percent: Number(p?.max_percent ?? 100) || 100,
  };
}

function CourseSettingsModal({
  course,
  onClose,
  onUpdated,
  onSaved,
}: {
  course: Course;
  onClose: () => void;
  onUpdated: (course: Course) => void;
  onSaved: (course: Course) => void;
}) {
  const [code, setCode] = useState(course.code);
  const [title, setTitle] = useState(course.title);
  const [description, setDescription] = useState(course.description ?? "");     
  const [semester, setSemester] = useState(course.semester ?? "");
  const [year, setYear] = useState(course.year?.toString() ?? "");
  const [selfEnrollEnabled, setSelfEnrollEnabled] = useState(
    course.self_enroll_enabled ?? false
  );
  const [selfEnrollCode, setSelfEnrollCode] = useState<string | null>(
    course.self_enroll_code ?? null
  );
  const [isRegeneratingEnrollCode, setIsRegeneratingEnrollCode] = useState(false);
  const [showRegenerateConfirm, setShowRegenerateConfirm] = useState(false);

  const initialLate = normalizeLatePolicy(course.late_policy);
  const [latePolicyEnabled, setLatePolicyEnabled] = useState(
    course.late_policy?.enabled ?? false
  );
  const [graceMinutes, setGraceMinutes] = useState(initialLate.grace_minutes);
  const [percentPerDay, setPercentPerDay] = useState(initialLate.percent_per_day);
  const [maxPercent, setMaxPercent] = useState(initialLate.max_percent);

  const [isSaving, setIsSaving] = useState(false);
  const [saveError, setSaveError] = useState("");

  function requestRegenerateEnrollCode() {
    if (!selfEnrollEnabled) {
      setSaveError("Enable self-enroll before regenerating the code.");
      return;
    }
    setShowRegenerateConfirm(true);
  }

  async function regenerateEnrollCodeConfirmed() {
    setIsRegeneratingEnrollCode(true);
    setSaveError("");
    try {
      const updated = await courseStaff.updateCourse(course.id, {
        regenerate_self_enroll_code: true,
      });
      onUpdated(updated);
      setSelfEnrollCode(updated.self_enroll_code ?? null);
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to regenerate self-enroll code");
    } finally {
      setIsRegeneratingEnrollCode(false);
    }
  }

  async function save() {
    setIsSaving(true);
    setSaveError("");

    const parsedYear = year.trim() ? Number(year) : null;
    const payload: CourseUpdate = {
      code: code.trim(),
      title: title.trim(),
      description: description.trim() ? description.trim() : null,
      semester: semester.trim() ? semester.trim() : null,
      year: parsedYear !== null && Number.isFinite(parsedYear) ? parsedYear : null,
      late_policy: latePolicyEnabled
        ? {
            enabled: true,
            type: "percent_per_day",
            grace_minutes: Number(graceMinutes) || 0,
            percent_per_day: Number(percentPerDay) || 0,
            max_percent: Number(maxPercent) || 0,
          }
        : null,
      self_enroll_enabled: selfEnrollEnabled,
    };

    try {
      const updated = await courseStaff.updateCourse(course.id, payload);
      onSaved(updated);
    } catch (err) {
      if (err instanceof ApiError) setSaveError(err.detail);
      else setSaveError("Failed to save settings");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <>
      <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
      onClick={onClose}
    >
      <motion.div
        initial={{ opacity: 0, y: 12, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 12, scale: 0.98 }}
        transition={{ duration: 0.15 }}
        className="w-full max-w-xl bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-[var(--foreground)]">Course settings</p>
            <p className="text-xs text-[var(--muted-foreground)]">{course.code}</p>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors"
            aria-label="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-5 space-y-5">
          {saveError && (
            <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
              {saveError}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Code
              </label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Term
              </label>
              <div className="flex gap-2">
                <input
                  value={semester}
                  onChange={(e) => setSemester(e.target.value)}
                  placeholder="Semester"
                  className="flex-1 px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
                <input
                  value={year}
                  onChange={(e) => setYear(e.target.value.replace(/[^\\d]/g, ""))}
                  inputMode="numeric"
                  placeholder="Year"
                  className="w-28 px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Title
            </label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-3">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Enrollment</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Optional self-enroll code for students. Students still provide profile details via invites/CSV.
                </p>
              </div>
              <button
                onClick={() => setSelfEnrollEnabled((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  selfEnrollEnabled
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--background)]/60"
                }`}
                type="button"
              >
                {selfEnrollEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            <div className="grid md:grid-cols-12 gap-3 items-end">
              <div className="md:col-span-8">
                <label className="block text-[11px] font-medium text-[var(--muted-foreground)] mb-2">
                  Self-enroll code
                </label>
                <input
                  value={selfEnrollCode ?? ""}
                  readOnly
                  placeholder={selfEnrollEnabled ? "Save to generate code" : "Disabled"}
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none"
                />
              </div>
              <div className="md:col-span-4 flex gap-2">
                <button
                  type="button"
                  disabled={!selfEnrollEnabled || !selfEnrollCode}
                  onClick={async () => {
                    if (!selfEnrollCode) return;
                    await navigator.clipboard.writeText(selfEnrollCode);
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  <Copy className="w-4 h-4" />
                  Copy
                </button>
                <button
                  type="button"
                  onClick={requestRegenerateEnrollCode}
                  disabled={!selfEnrollEnabled || isRegeneratingEnrollCode}
                  className="flex-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isRegeneratingEnrollCode ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  Regenerate
                </button>
              </div>
            </div>
          </div>

          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4 space-y-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-[var(--foreground)]">Late policy</p>
                <p className="text-xs text-[var(--muted-foreground)]">
                  Applies to assignments unless overridden.
                </p>
              </div>
              <button
                onClick={() => setLatePolicyEnabled((v) => !v)}
                className={`px-3 py-1.5 rounded-xl text-xs font-medium border transition-colors ${
                  latePolicyEnabled
                    ? "bg-[var(--primary)] text-white border-[var(--primary)]"
                    : "bg-[var(--background)] text-[var(--muted-foreground)] border-[var(--border)] hover:bg-[var(--background)]/60"
                }`}
                type="button"
              >
                {latePolicyEnabled ? "Enabled" : "Disabled"}
              </button>
            </div>

            {latePolicyEnabled && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted-foreground)] mb-2">
                    Grace (minutes)
                  </label>
                  <input
                    type="number"
                    value={graceMinutes}
                    onChange={(e) => setGraceMinutes(Number(e.target.value))}
                    min={0}
                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted-foreground)] mb-2">
                    % per day
                  </label>
                  <input
                    type="number"
                    value={percentPerDay}
                    onChange={(e) => setPercentPerDay(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
                <div>
                  <label className="block text-[11px] font-medium text-[var(--muted-foreground)] mb-2">
                    Max %
                  </label>
                  <input
                    type="number"
                    value={maxPercent}
                    onChange={(e) => setMaxPercent(Number(e.target.value))}
                    min={0}
                    max={100}
                    className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="p-5 border-t border-[var(--border)] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-sm"
          >
            Cancel
          </button>
          <button
            onClick={save}
            disabled={isSaving || !code.trim() || !title.trim()}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
          >
            {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            Save
          </button>
        </div>
      </motion.div>
    </motion.div>

    <ConfirmModal
      isOpen={showRegenerateConfirm}
      onClose={() => setShowRegenerateConfirm(false)}
      onConfirm={() => {
        setShowRegenerateConfirm(false);
        void regenerateEnrollCodeConfirmed();
      }}
      title="Regenerate self-enroll code?"
      description="Old codes will stop working immediately. Continue?"
      confirmLabel="Regenerate"
      confirmVariant="danger"
      isLoading={isRegeneratingEnrollCode}
    />
    </>
  );
}

// Overview Tab
interface OverviewTabProps {
  course: Course;
  modules: Module[];
  assignments: Assignment[];
  memberships: CourseMembership[];
  onQuickAction: (action: "create_assignment" | "import_roster" | "add_module") => void;
}

function OverviewTab({
  course,
  modules,
  assignments,
  memberships,
  onQuickAction,
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
            <button
              type="button"
              onClick={() => onQuickAction("create_assignment")}
              className="w-full flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                <Plus className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Create Assignment
              </span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction("import_roster")}
              className="w-full flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--background)] border border-[var(--border)] flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
                <Upload className="w-5 h-5" />
              </div>
              <span className="text-sm font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                Import Roster
              </span>
            </button>
            <button
              type="button"
              onClick={() => onQuickAction("add_module")}
              className="w-full flex items-center gap-3 p-4 bg-[var(--card)] border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left group"
            >
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
                <Link
                  key={assignment.id}
                  href={`/staff/courses/${course.id}/assignments/${assignment.id}`}
                  className="p-4 flex items-center gap-4 hover:bg-[var(--background)] transition-colors"
                >
                  <div className="w-10 h-10 rounded-lg bg-amber-500/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-amber-600" />
                  </div>
                  <div className="min-w-0 flex-1">
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
                  <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)]" />
                </Link>
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
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isNavigatingNext, setIsNavigatingNext] = useState(false);
  const [error, setError] = useState("");

  const [missingSummary, setMissingSummary] = useState<MissingSubmissionsSummaryItem[]>([]);
  const [missingAssignmentId, setMissingAssignmentId] = useState<number | null>(null);
  const [missingStudents, setMissingStudents] = useState<MissingStudentOut[]>([]);
  const [isMissingLoading, setIsMissingLoading] = useState(false);
  const [missingError, setMissingError] = useState("");

  const canGoPrev = offset > 0;
  const canGoNext = offset + items.length < total;

  function resetPaging() {
    setOffset(0);
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
    } catch (err) {
      reportError("Failed to copy missing student emails", err);
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
                <span className="text-xs text-[var(--muted-foreground)] font-mono">
                  {total === 0 ? "0" : `${offset + 1}–${offset + items.length}`} of {total}
                </span>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1">
                  <button onClick={() => setOffset((o) => Math.max(0, o - limit))} disabled={!canGoPrev} className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronLeft className="w-4 h-4" /></button>
                  <button onClick={() => setOffset((o) => o + limit)} disabled={!canGoNext} className="p-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] disabled:opacity-50 disabled:cursor-not-allowed transition-colors"><ChevronRight className="w-4 h-4" /></button>
                </div>
              </div>
            </div>

            <div className="divide-y divide-[var(--border)]">
              {items.map((s) => (
                <div key={s.id} onClick={() => router.push(`/staff/submissions/${s.id}`)} className="group grid grid-cols-12 gap-4 px-5 py-4 hover:bg-[var(--background)] transition-colors cursor-pointer items-center">
                  <div className="col-span-6 min-w-0">
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

// Roster Tab
interface RosterTabProps {
  course: Course;
  memberships: CourseMembership[];
  onRefresh: () => Promise<void>;
  focusImportCsvOnMount?: boolean;
  onConsumedFocusImportCsv?: () => void;
}

function RosterTab({
  course,
  memberships,
  onRefresh,
  focusImportCsvOnMount = false,
  onConsumedFocusImportCsv,
}: RosterTabProps) {
  const [orgMembers, setOrgMembers] = useState<OrgMembership[]>([]);
  const [memberSearch, setMemberSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);    
  const [newRole, setNewRole] = useState<"co_lecturer" | "ta">("ta");
  const [isAddingStaff, setIsAddingStaff] = useState(false);
  const [isAddingStudent, setIsAddingStudent] = useState(false);
  const [isLoadingOrg, setIsLoadingOrg] = useState(false);
  const [noticeArea, setNoticeArea] = useState<"student" | "staff" | null>(null);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState<string>("");
  const [showStaffSection, setShowStaffSection] = useState(false);
  const [inviteLinks, setInviteLinks] = useState<string[]>([]);
  const [notifyNewSubmissions, setNotifyNewSubmissions] = useState(true);
  const [isSavingNotifyNewSubmissions, setIsSavingNotifyNewSubmissions] = useState(false);
  const [notifyPrefError, setNotifyPrefError] = useState("");
  const [confirmRemoveMembershipId, setConfirmRemoveMembershipId] = useState<number | null>(null);
  const [isRemovingMember, setIsRemovingMember] = useState(false);

  const [studentEmail, setStudentEmail] = useState("");
  const [studentName, setStudentName] = useState("");
  const [studentNumber, setStudentNumber] = useState("");
  const [studentProgramme, setStudentProgramme] = useState<Programme | "">("");

  const enrollStudentsRef = useRef<HTMLDivElement>(null);
  const importCsvButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    async function loadOrgMembers() {
      setIsLoadingOrg(true);
      try {
        const data = await courseStaff.listOrgMembers(course.id);
        setOrgMembers(data);
      } catch (err) {
        reportError("Failed to load org members", err);
      } finally {
        setIsLoadingOrg(false);
      }
    }
    loadOrgMembers();
  }, [course.id]);

  useEffect(() => {
    if (!focusImportCsvOnMount) return;
    // Browsers may block opening a file picker without a direct user gesture,
    // so we scroll + focus the Import CSV button instead.
    enrollStudentsRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    importCsvButtonRef.current?.focus();
    onConsumedFocusImportCsv?.();
  }, [focusImportCsvOnMount, onConsumedFocusImportCsv]);

  useEffect(() => {
    let cancelled = false;
    async function loadNotificationPrefs() {
      try {
        const prefs = await courseStaff.getNotificationPreferences(course.id);
        if (cancelled) return;
        setNotifyNewSubmissions(Boolean(prefs.notify_new_submissions));
      } catch {
        // Default to enabled if prefs aren't available.
      }
    }
    loadNotificationPrefs();
    return () => {
      cancelled = true;
    };
  }, [course.id]);

  const students = memberships.filter((m) => m.role === "student");
  const staffMembers = memberships.filter((m) => m.role !== "student");

  const availableOrgMembers = useMemo(() => {
    const assigned = new Set(memberships.map((m) => m.user_id));
    const q = memberSearch.trim().toLowerCase();
    const filtered = orgMembers.filter((m) => {
      if (assigned.has(m.user_id)) return false;
      if (!q) return true;
      return (m.user_email ?? "").toLowerCase().includes(q);
    });
    return filtered.sort((a, b) => (a.user_email ?? "").localeCompare(b.user_email ?? ""));
  }, [orgMembers, memberships, memberSearch]);

  const resolvedInviteLinks = useMemo(() => {
    if (typeof window === "undefined") return inviteLinks;
    const origin = window.location.origin;
    return inviteLinks.map((link) => {
      if (link.startsWith("http://") || link.startsWith("https://")) return link;
      if (link.startsWith("/")) return `${origin}${link}`;
      return `${origin}/${link}`;
    });
  }, [inviteLinks]);

  async function toggleNotifyNewSubmissions() {
    const next = !notifyNewSubmissions;
    setIsSavingNotifyNewSubmissions(true);
    setNotifyPrefError("");
    try {
      const updated = await courseStaff.setNotificationPreferences(course.id, {
        notify_new_submissions: next,
      });
      setNotifyNewSubmissions(Boolean(updated.notify_new_submissions));
    } catch (err) {
      if (err instanceof ApiError) setNotifyPrefError(err.detail);
      else setNotifyPrefError("Failed to update notification preferences");
    } finally {
      setIsSavingNotifyNewSubmissions(false);
    }
  }

  async function addStaffMember() {
    if (selectedUserId === null) return;
    setIsAddingStaff(true);
    setNoticeArea("staff");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    try {
      const payload: CourseMembershipCreate = { user_id: selectedUserId, role: newRole };
      await courseStaff.enrollUser(course.id, payload);
      await onRefresh();
      setSelectedUserId(null);
      setMemberSearch("");
      setSuccess("Staff member added.");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to add staff member");
    } finally {
      setIsAddingStaff(false);
    }
  }

  async function updateRole(membershipId: number, role: CourseMembership["role"]) {
    setNoticeArea("staff");
    setError("");
    try {
      const payload: CourseMembershipUpdate = { role };
      await courseStaff.updateMembership(course.id, membershipId, payload);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to update role");
    }
  }

  function requestRemoveMember(membershipId: number) {
    setConfirmRemoveMembershipId(membershipId);
  }

  async function removeMemberConfirmed() {
    if (confirmRemoveMembershipId === null) return;
    setIsRemovingMember(true);
    setNoticeArea("staff");
    setError("");
    try {
      await courseStaff.removeMembership(course.id, confirmRemoveMembershipId);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to remove member");
    } finally {
      setIsRemovingMember(false);
      setConfirmRemoveMembershipId(null);
    }
  }

  const fileInputRef = useRef<HTMLInputElement>(null);

  async function addStudentByEmail() {
    const email = studentEmail.trim();
    const full_name = studentName.trim();
    const student_number = studentNumber.trim();
    const programme = studentProgramme.trim();
    if (!email || !full_name || !student_number || !programme) return;

    setIsAddingStudent(true);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    try {
      const res = await courseStaff.inviteStudentByEmail(course.id, {
        email,
        full_name,
        student_number,
        programme,
      });

      await onRefresh();

      if (res.auto_enrolled > 0) {
        setSuccess("Student enrolled (existing account).");
      } else if (res.created_invites > 0) {
        setSuccess(
          "Invite created (no email yet). Copy the invite link below and share it manually."
        );
        setInviteLinks(res.invite_links ?? []);
      } else {
        setSuccess("No invite created.");
      }

      setStudentEmail("");
      setStudentName("");
      setStudentNumber("");
      setStudentProgramme("");
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to invite student");
    } finally {
      setIsAddingStudent(false);
    }
  }

  async function handleCsvUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsAddingStudent(true);
    setNoticeArea("student");
    setError("");
    setSuccess("");
    setInviteLinks([]);
    try {
      const res = await courseStaff.importRosterCsv(course.id, file);     
      const msg = `Imported: ${res.created_invites} invites created, ${res.auto_enrolled} auto-enrolled.`;
      if (res.issues.length > 0) {
        setError(`${msg} Some rows had issues.`);
      } else {
        setSuccess(msg);
      }
      if ((res.invite_links ?? []).length > 0) setInviteLinks(res.invite_links);
      await onRefresh();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to import CSV");
    } finally {
      setIsAddingStudent(false);
      // Reset input
      e.target.value = "";
    }
  }

  async function copyInviteLinksAll() {
    setNoticeArea("student");
    try {
      await navigator.clipboard.writeText(resolvedInviteLinks.join("\n"));
      setSuccess("Invite links copied to clipboard.");
    } catch {
      setError("Failed to copy invite links.");
    }
  }

  async function copyInviteLink(link: string) {
    setNoticeArea("student");
    try {
      await navigator.clipboard.writeText(link);
      setSuccess("Invite link copied.");
    } catch {
      setError("Failed to copy invite link.");
    }
  }

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    co_lecturer: "Co-Lecturer",
    ta: "TA",
    student: "Student",
  };

  return (
    <div className="flex flex-col gap-8">
      {/* Notifications */}
      <div className="order-0 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-1">Notifications</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              New submissions are grouped into a digest (10-minute window).
            </p>
          </div>
          <button
            type="button"
            onClick={toggleNotifyNewSubmissions}
            disabled={isSavingNotifyNewSubmissions}
            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifyNewSubmissions ? "bg-[var(--primary)]" : "bg-[var(--border)]"} disabled:opacity-60`}
            aria-label="Toggle new submission notifications"
          >
            <span
              className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifyNewSubmissions ? "translate-x-6" : "translate-x-1"}`}
            />
          </button>
        </div>
        {notifyPrefError && (
          <div className="mt-3 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {notifyPrefError}
          </div>
        )}
      </div>

      <div className="order-3 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <button
          type="button"
          onClick={() => setShowStaffSection((v) => !v)}
          className="w-full p-4 bg-[var(--background)] flex items-center justify-between"
        >
          <h3 className="font-medium text-[var(--foreground)]">
            Staff ({staffMembers.length})
          </h3>
          <span className="inline-flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            {showStaffSection ? "Hide" : "Show"}
            {showStaffSection ? (
              <ChevronUp className="w-4 h-4" />
            ) : (
              <ChevronDown className="w-4 h-4" />
            )}
          </span>
        </button>
      </div>

      {showStaffSection && (
        <>
          {/* Add Staff */}
          <div className="order-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5">
        <h3 className="font-medium text-[var(--foreground)] mb-1">Add staff</h3>
        <p className="text-xs text-[var(--muted-foreground)] mb-4">
          Staff are selected from organization members. Students are enrolled via invites (above).
        </p>
        {noticeArea === "staff" && error && (
          <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {error}
          </div>
        )}
        {noticeArea === "staff" && success && (
          <div className="mb-4 p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl text-sm text-[var(--success)]">
            {success}
          </div>
        )}
        <div className="grid md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-5">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Select staff member
            </label>
            <select
              value={selectedUserId ?? ""}
              onChange={(e) => setSelectedUserId(e.target.value ? Number(e.target.value) : null)}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              disabled={isLoadingOrg}
            >
              <option value="">
                {isLoadingOrg
                  ? "Loading users..."
                  : availableOrgMembers.length === 0
                    ? "No eligible users found"
                    : "Select a user..."}
              </option>
              {availableOrgMembers.map((m) => (
                <option key={m.id} value={m.user_id}>
                  {(m.user_email ?? `User #${m.user_id}`)}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Staff role
            </label>
            <select
              value={newRole}
              onChange={(e) => {
                const value = e.target.value;
                if (value === "ta" || value === "co_lecturer") setNewRole(value);
              }}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            >
              <option value="ta">TA</option>
              <option value="co_lecturer">Co-Lecturer</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <button
              onClick={addStaffMember}
              disabled={isAddingStaff || selectedUserId === null}
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingStaff ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add staff
            </button>
          </div>
        </div>
      </div>

      {/* Staff List */}
      <div className="order-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[var(--background)] border-b border-[var(--border)] flex justify-between items-center">
          <h3 className="font-medium text-[var(--foreground)]">
            Staff ({staffMembers.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {staffMembers.length === 0 ? (
            <div className="p-8 text-center text-[var(--muted-foreground)]">No staff members</div>
          ) : (
            staffMembers.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--background)] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--primary)]/10 flex items-center justify-center">
                    <Users className="w-5 h-5 text-[var(--primary)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {member.user_email || `User #${member.user_id}`}
                    </p>
                    <p className="text-sm text-[var(--muted-foreground)]">
                      {roleLabels[member.role]}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <select
                    value={member.role}
                    onChange={(e) => {
                      const value = e.target.value;
                      if (value === "owner" || value === "co_lecturer" || value === "ta") {
                        updateRole(member.id, value);
                      }
                    }}
                    className="text-sm border border-[var(--border)] rounded-lg bg-[var(--background)] px-2 py-1"
                  >
                    <option value="owner">Owner</option>
                    <option value="co_lecturer">Co-Lecturer</option>
                    <option value="ta">TA</option>
                  </select>
                  <button
                    onClick={() => requestRemoveMember(member.id)}
                    className="p-2 text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                    title="Remove member"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

        </>
      )}

      {/* Enroll Students */}
      <div
        ref={enrollStudentsRef}
        className="order-1 bg-[var(--card)] border border-[var(--border)] rounded-2xl p-5"
      >
        <div className="flex items-start justify-between gap-3 mb-4">
          <div>
            <h3 className="font-medium text-[var(--foreground)] mb-1">Enroll students</h3>
            <p className="text-xs text-[var(--muted-foreground)]">
              Students are enrolled via invites. Use roster import (CSV) or invite a student by email with their profile details.
            </p>
          </div>
          <input
            type="file"
            ref={fileInputRef}
            className="hidden"
            accept=".csv"
            onChange={handleCsvUpload}
          />
          <button
            ref={importCsvButtonRef}
            type="button"
            onClick={() => fileInputRef.current?.click()}
            disabled={isAddingStudent}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-60 transition-colors text-sm"
          >
            {isAddingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            Import CSV
          </button>
        </div>

        {noticeArea === "student" && error && (
          <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
            {error}
          </div>
        )}
        {noticeArea === "student" && success && (
          <div className="mb-4 p-3 bg-[var(--success)]/10 border border-[var(--success)]/20 rounded-xl text-sm text-[var(--success)]">
            {success}
          </div>
        )}
        {resolvedInviteLinks.length > 0 && (
          <div className="mb-4 p-4 bg-[var(--background)] border border-[var(--border)] rounded-2xl">
            <div className="flex items-start justify-between gap-3 mb-3">
              <div>
                <p className="text-sm font-medium text-[var(--foreground)]">Invite links</p>
                <p className="text-[11px] text-[var(--muted-foreground)]">
                  No emails yet — share these manually with the student(s).
                </p>
              </div>
              <button
                type="button"
                onClick={copyInviteLinksAll}
                className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--card)]/70 transition-colors text-xs"
              >
                Copy all
              </button>
            </div>
            <div className="space-y-2">
              {resolvedInviteLinks.map((link) => (
                <div
                  key={link}
                  className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)]"
                >
                  <code className="text-xs text-[var(--foreground)] break-all">{link}</code>
                  <button
                    type="button"
                    onClick={() => copyInviteLink(link)}
                    className="shrink-0 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary)]/90 transition-colors text-xs"
                  >
                    Copy
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="grid md:grid-cols-12 gap-3 items-end">
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Email
            </label>
            <input
              value={studentEmail}
              onChange={(e) => setStudentEmail(e.target.value)}
              placeholder="student@example.com"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <div className="md:col-span-4">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Full name
            </label>
            <input
              value={studentName}
              onChange={(e) => setStudentName(e.target.value)}
              placeholder="Jane Doe"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Student #
            </label>
            <input
              value={studentNumber}
              onChange={(e) => setStudentNumber(e.target.value)}
              placeholder="2100714449"
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Programme
            </label>
            <select
              value={studentProgramme}
              onChange={(e) => {
                const value = e.target.value;
                setStudentProgramme(value ? (value as Programme) : "");
              }}
              className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)]"
            >
              <option value="">Select programme...</option>
              {PROGRAMMES.map((p) => (
                <option key={p} value={p}>
                  {p}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-12">
            <button
              type="button"
              onClick={addStudentByEmail}
              disabled={
                isAddingStudent ||
                !studentEmail.trim() ||
                !studentName.trim() ||
                !studentNumber.trim() ||
                !studentProgramme
              }
              className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isAddingStudent ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Enroll / invite student
            </button>
            <p className="mt-2 text-[11px] text-[var(--muted-foreground)]">
              Existing accounts auto-enroll immediately. New students get an invite link (valid 7 days) via the invite flow.
            </p>
          </div>
        </div>
      </div>

      {/* Student List */}
      <div className="order-2 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="p-4 bg-[var(--background)] border-b border-[var(--border)]">
          <h3 className="font-medium text-[var(--foreground)]">
            Students ({students.length})
          </h3>
        </div>
        <div className="divide-y divide-[var(--border)]">
          {students.length === 0 ? (
            <div className="p-8 text-center">
              <Users className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-3" />
              <p className="text-[var(--muted-foreground)]">No students enrolled yet</p>
            </div>
          ) : (
            students.map((member) => (
              <div
                key={member.id}
                className="flex items-center justify-between p-4 hover:bg-[var(--background)] transition-colors group"
              >
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-full bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
                    <Users className="w-5 h-5 text-[var(--muted-foreground)]" />
                  </div>
                  <div>
                    <p className="font-medium text-[var(--foreground)]">
                      {member.user_email || `User #${member.user_id}`}
                    </p>
                    {member.student_number && (
                      <p className="text-sm text-[var(--muted-foreground)]">
                        {member.student_number}
                      </p>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <button
                    onClick={() => requestRemoveMember(member.id)}
                    className="p-2 text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                    title="Remove student"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <ConfirmModal
        isOpen={confirmRemoveMembershipId !== null}
        onClose={() => setConfirmRemoveMembershipId(null)}
        onConfirm={() => void removeMemberConfirmed()}
        title="Remove member?"
        description="This will remove the member from the course. Continue?"
        confirmLabel="Remove"
        confirmVariant="danger"
        isLoading={isRemovingMember}
      />
    </div >
  );
}

// Assignments Tab
interface AssignmentsTabProps {
  course: Course;
  assignments: Assignment[];
  modules: Module[];
  onRefreshAssignments: () => Promise<void>;
  openCreateOnMount?: boolean;
  onConsumedOpenCreate?: () => void;
}

function AssignmentsTab({
  course,
  assignments,
  modules,
  onRefreshAssignments,
  openCreateOnMount = false,
  onConsumedOpenCreate,
}: AssignmentsTabProps) {
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAssignmentId, setEditingAssignmentId] = useState<number | null>(null);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newModuleId, setNewModuleId] = useState<number | null>(null);
  const [newMaxPoints, setNewMaxPoints] = useState<number>(100);
  const [newDueDateLocal, setNewDueDateLocal] = useState("");
  const [newAllowsZip, setNewAllowsZip] = useState(false);
  const [newExpectedFilename, setNewExpectedFilename] = useState("");
  const [newCompileCommand, setNewCompileCommand] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");
  const [error, setError] = useState("");
  const [confirmDeleteAssignment, setConfirmDeleteAssignment] = useState<Assignment | null>(null);
  const [isDeletingAssignment, setIsDeletingAssignment] = useState(false);

  function toDateTimeLocalValue(date: Date): string {
    const pad = (n: number) => String(n).padStart(2, "0");
    const yyyy = date.getFullYear();
    const mm = pad(date.getMonth() + 1);
    const dd = pad(date.getDate());
    const hh = pad(date.getHours());
    const min = pad(date.getMinutes());
    return `${yyyy}-${mm}-${dd}T${hh}:${min}`;
  }

  const openCreate = useCallback(() => {
    setEditingAssignmentId(null);
    setNewTitle("");
    setNewDescription("");
    setNewModuleId(modules[0]?.id ?? null);
    setNewMaxPoints(100);
    setNewDueDateLocal("");
    setNewAllowsZip(false);
    setNewExpectedFilename("");
    setNewCompileCommand("");
    setCreateError("");
    setError("");
    setShowCreateModal(true);
  }, [modules]);

  useEffect(() => {
    if (!openCreateOnMount) return;
    openCreate();
    onConsumedOpenCreate?.();
  }, [openCreate, onConsumedOpenCreate, openCreateOnMount]);

  function openEdit(assignment: Assignment) {
    setEditingAssignmentId(assignment.id);
    setNewTitle(assignment.title);
    setNewDescription(assignment.description ?? "");
    setNewModuleId(assignment.module_id ?? null);
    setNewMaxPoints(assignment.max_points ?? 100);
    setNewDueDateLocal(
      assignment.due_date ? toDateTimeLocalValue(new Date(assignment.due_date)) : ""
    );
    setNewAllowsZip(Boolean(assignment.allows_zip));
    setNewExpectedFilename(assignment.expected_filename ?? "");
    setNewCompileCommand(assignment.compile_command ?? "");
    setCreateError("");
    setError("");
    setShowCreateModal(true);
  }

  function closeModal() {
    setShowCreateModal(false);
    setEditingAssignmentId(null);
  }

  const getModuleName = (moduleId: number | null) => {
    if (moduleId === null) return "Unassigned";
    const moduleRow = modules.find((m) => m.id === moduleId);
    return moduleRow?.title || "Unknown Module";
  };

  async function deleteAssignmentConfirmed() {
    if (!confirmDeleteAssignment) return;
    setIsDeletingAssignment(true);
    setError("");
    try {
      await courseStaff.deleteAssignment(course.id, confirmDeleteAssignment.id);
      await onRefreshAssignments();
    } catch (err) {
      reportError("Failed to delete assignment", err);
      setError("Failed to delete assignment");
    } finally {
      setIsDeletingAssignment(false);
      setConfirmDeleteAssignment(null);
    }
  }

  async function createAssignment() {
    const title = newTitle.trim();
    if (!title) return;
    setIsCreating(true);
    setCreateError("");
    setError("");
    try {
      const expectedFilename = newExpectedFilename.trim();
      const compileCommand = newCompileCommand.trim();
      if (newAllowsZip && expectedFilename && compileCommand) {
        setCreateError("Choose either expected filename or compile command (not both).");
        return;
      }

      const payload = {
        title,
        description: newDescription.trim() ? newDescription.trim() : null,
        module_id: newModuleId,
        due_date: newDueDateLocal ? new Date(newDueDateLocal).toISOString() : null,
        max_points: newMaxPoints,
        allows_zip: newAllowsZip,
        expected_filename: newAllowsZip ? (expectedFilename || null) : null,
        compile_command: newAllowsZip ? (compileCommand || null) : null,
      };
      if (editingAssignmentId !== null) {
        await courseStaff.updateAssignment(course.id, editingAssignmentId, payload);
      } else {
        await courseStaff.createAssignment(course.id, payload);
      }
      await onRefreshAssignments();
      closeModal();
    } catch (err) {
      if (err instanceof ApiError) setCreateError(err.detail);
      else setCreateError("Failed to create assignment");
    } finally {
      setIsCreating(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Actions */}
      <div className="flex items-center justify-between">
        <p className="text-[var(--muted-foreground)]">
          {assignments.length} assignments
        </p>
        <button
          onClick={openCreate}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Create Assignment</span>
        </button>
      </div>

      {error && (
        <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
          {error}
        </div>
      )}

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={closeModal}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-xl bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">
                    {editingAssignmentId === null ? "New assignment" : "Edit assignment"}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">{course.code}</p>
                </div>
                <button
                  onClick={closeModal}
                  className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {createError && (
                  <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                    {createError}
                  </div>
                )}

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Title
                    </label>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Assignment 1: Hello World"
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Description (optional)
                    </label>
                    <textarea
                      value={newDescription}
                      onChange={(e) => setNewDescription(e.target.value)}
                      rows={5}
                      placeholder="Instructions..."
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] resize-y"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Module
                    </label>
                    <select
                      value={newModuleId ?? ""}
                      onChange={(e) => setNewModuleId(e.target.value ? Number(e.target.value) : null)}
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="">Unassigned</option>
                      {modules
                        .slice()
                        .sort((a, b) => a.position - b.position)
                        .map((m) => (
                          <option key={m.id} value={m.id}>
                            {m.position}. {m.title}
                          </option>
                        ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Max points
                    </label>
                    <input
                      type="number"
                      value={newMaxPoints}
                      min={0}
                      onChange={(e) => setNewMaxPoints(Number(e.target.value))}
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Due date (optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={newDueDateLocal}
                      onChange={(e) => setNewDueDateLocal(e.target.value)}
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                  </div>

                  <div className="md:col-span-2">
                    <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
                      <label className="flex items-center gap-3 text-sm font-medium text-[var(--foreground)]">
                        <input
                          type="checkbox"
                          checked={newAllowsZip}
                          onChange={(e) => {
                            const next = e.target.checked;
                            setNewAllowsZip(next);
                            if (!next) {
                              setNewExpectedFilename("");
                              setNewCompileCommand("");
                            }
                          }}
                          className="w-4 h-4"
                        />
                        Allow ZIP submissions
                      </label>

                      {newAllowsZip ? (
                        <div className="mt-4 grid md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                              Expected filename (optional)
                            </label>
                            <input
                              value={newExpectedFilename}
                              onChange={(e) => setNewExpectedFilename(e.target.value)}
                              placeholder="e.g., solution.c"
                              disabled={Boolean(newCompileCommand.trim())}
                              className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              If set, we grade that file from the ZIP.
                            </p>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                              Compile command (optional)
                            </label>
                            <input
                              value={newCompileCommand}
                              onChange={(e) => setNewCompileCommand(e.target.value)}
                              placeholder="e.g., gcc main.c utils.c"
                              disabled={Boolean(newExpectedFilename.trim())}
                              className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] disabled:opacity-60 disabled:cursor-not-allowed"
                            />
                            <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                              Use for multi-file projects (gcc/g++ only; -o is ignored).
                            </p>
                          </div>
                        </div>
                      ) : null}

                      <p className="mt-3 text-xs text-[var(--muted-foreground)]">
                        ZIP rules: flat structure (no folders), max 50 files, max 10MB uncompressed.
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="p-5 border-t border-[var(--border)] flex items-center justify-end gap-2">
                <button
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createAssignment}
                  disabled={isCreating || !newTitle.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  {editingAssignmentId === null ? "Create" : "Save"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                  className={`w-10 h-10 rounded-lg flex items-center justify-center ${isPastDue ? "bg-[var(--muted-foreground)]/10" : "bg-[var(--primary)]/10"
                    }`}
                >
                  <FileText
                    className={`w-5 h-5 ${isPastDue ? "text-[var(--muted-foreground)]" : "text-[var(--primary)]"
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
                        className={`text-xs ${isPastDue
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
                    <Link
                      href={`/staff/courses/${course.id}/assignments/${assignment.id}`}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border border-[var(--border)] bg-[var(--card)] text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] transition-colors"
                      title="Manage test cases"
                    >
                      <Beaker className="w-3.5 h-3.5" />
                      Tests
                    </Link>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openEdit(assignment)}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
                    aria-label="Edit assignment"
                    title="Edit assignment"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setConfirmDeleteAssignment(assignment)}
                    className="p-2 text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 rounded-lg transition-colors"
                    aria-label="Delete assignment"
                    title="Delete assignment"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      <ConfirmModal
        isOpen={confirmDeleteAssignment !== null}
        onClose={() => setConfirmDeleteAssignment(null)}
        onConfirm={() => void deleteAssignmentConfirmed()}
        title={confirmDeleteAssignment ? `Delete \"${confirmDeleteAssignment.title}\"?` : "Delete assignment?"}
        description="This cannot be undone. Continue?"
        confirmLabel="Delete"
        confirmVariant="danger"
        isLoading={isDeletingAssignment}
      />
    </div>
  );
}

// Modules Tab with Resources Management
interface ModulesTabProps {
  course: Course;
  modules: Module[];
  onRefreshModules: () => Promise<void>;
  openCreateOnMount?: boolean;
  onConsumedOpenCreate?: () => void;
}

function ModulesTab({
  course,
  modules,
  onRefreshModules,
  openCreateOnMount = false,
  onConsumedOpenCreate,
}: ModulesTabProps) {
  const [expandedModules, setExpandedModules] = useState<Set<number>>(new Set());
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newPosition, setNewPosition] = useState<number>(1);
  const [isCreating, setIsCreating] = useState(false);
  const [createError, setCreateError] = useState("");

  const orderedModules = useMemo(
    () => [...modules].sort((a, b) => a.position - b.position),
    [modules]
  );

  const nextPosition = useMemo(() => {
    if (modules.length === 0) return 1;
    return Math.max(...modules.map((m) => m.position)) + 1;
  }, [modules]);

  useEffect(() => {
    if (!showCreateModal) return;
    setNewTitle("");
    setNewPosition(nextPosition);
    setCreateError("");
  }, [showCreateModal, nextPosition]);

  useEffect(() => {
    if (!openCreateOnMount) return;
    setShowCreateModal(true);
    onConsumedOpenCreate?.();
  }, [onConsumedOpenCreate, openCreateOnMount]);

  async function createModule() {
    const title = newTitle.trim();
    if (!title) return;
    setIsCreating(true);
    setCreateError("");
    try {
      await courseStaff.createModule(course.id, { title, position: newPosition });
      await onRefreshModules();
      setShowCreateModal(false);
    } catch (err) {
      if (err instanceof ApiError) setCreateError(err.detail);
      else setCreateError("Failed to create module");
    } finally {
      setIsCreating(false);
    }
  }
 
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
        <button
          onClick={() => setShowCreateModal(true)}
          className="flex items-center gap-2 px-4 py-2 bg-[var(--primary)] text-white rounded-lg hover:bg-[var(--primary)]/90 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>Add Module</span>
        </button>
      </div>

      <AnimatePresence>
        {showCreateModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowCreateModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">New module</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{course.code}</p>
                </div>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {createError && (
                  <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                    {createError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Title</label>
                  <input
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    placeholder="e.g. Week 1: Basics"
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Position</label>
                  <input
                    type="number"
                    value={newPosition}
                    onChange={(e) => setNewPosition(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">Suggested next position: {nextPosition}</p>
                </div>
              </div>

              <div className="p-5 border-t border-[var(--border)] flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={createModule}
                  disabled={isCreating || !newTitle.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Create
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
          {orderedModules.map((module, idx) => (
            <ModuleCard
              key={module.id}
              courseId={course.id}
              module={module}
              isExpanded={expandedModules.has(module.id)}
              onToggle={() => toggleModule(module.id)}
              onChanged={onRefreshModules}
              canMoveUp={idx > 0}
              canMoveDown={idx < orderedModules.length - 1}
              onMoveUp={async () => {
                if (idx <= 0) return;
                const other = orderedModules[idx - 1];
                await Promise.all([
                  courseStaff.updateModule(course.id, module.id, { position: other.position }),
                  courseStaff.updateModule(course.id, other.id, { position: module.position }),
                ]);
                await onRefreshModules();
              }}
              onMoveDown={async () => {
                if (idx >= orderedModules.length - 1) return;
                const other = orderedModules[idx + 1];
                await Promise.all([
                  courseStaff.updateModule(course.id, module.id, { position: other.position }),
                  courseStaff.updateModule(course.id, other.id, { position: module.position }),
                ]);
                await onRefreshModules();
              }}
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
  onChanged: () => Promise<void>;
  canMoveUp: boolean;
  canMoveDown: boolean;
  onMoveUp: () => Promise<void>;
  onMoveDown: () => Promise<void>;
}

function ModuleCard(
  { courseId, module, isExpanded, onToggle, onChanged, canMoveUp, canMoveDown, onMoveUp, onMoveDown }: ModuleCardProps
) {
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [showAddModal, setShowAddModal] = useState<"link" | "file" | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editTitle, setEditTitle] = useState(module.title);
  const [editPosition, setEditPosition] = useState<number>(module.position);    
  const [isSavingModule, setIsSavingModule] = useState(false);
  const [moduleEditError, setModuleEditError] = useState("");
  const [isMovingModule, setIsMovingModule] = useState(false);
  const [movingResourceId, setMovingResourceId] = useState<number | null>(null);
  const [showDeleteModuleConfirm, setShowDeleteModuleConfirm] = useState(false);
  const [confirmDeleteResourceId, setConfirmDeleteResourceId] = useState<number | null>(null);
  const [isDeletingModule, setIsDeletingModule] = useState(false);
  const [isDeletingResource, setIsDeletingResource] = useState(false);

  useEffect(() => {
    setEditTitle(module.title);
    setEditPosition(module.position);
  }, [module.id, module.title, module.position]);

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

  async function saveModule() {
    const title = editTitle.trim();
    if (!title) return;
    setIsSavingModule(true);
    setModuleEditError("");
    try {
      await courseStaff.updateModule(courseId, module.id, { title, position: editPosition });
      await onChanged();
      setShowEditModal(false);
    } catch (err) {
      if (err instanceof ApiError) setModuleEditError(err.detail);
      else setModuleEditError("Failed to update module");
    } finally {
      setIsSavingModule(false);
    }
  }

  function requestDeleteModule() {
    setShowDeleteModuleConfirm(true);
  }

  async function deleteModuleConfirmed() {
    setIsDeletingModule(true);
    setModuleEditError("");
    try {
      await courseStaff.deleteModule(courseId, module.id);
      await onChanged();
    } catch (err) {
      if (err instanceof ApiError) setModuleEditError(err.detail);
      else setModuleEditError("Failed to delete module");
    } finally {
      setIsDeletingModule(false);
      setShowDeleteModuleConfirm(false);
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
      reportError("Failed to toggle publish", err);
    }
  }

  async function moveResource(resourceId: number, direction: "up" | "down") {
    if (movingResourceId !== null) return;
    const idx = resources.findIndex((r) => r.id === resourceId);
    if (idx < 0) return;
    const swapIdx = direction === "up" ? idx - 1 : idx + 1;
    if (swapIdx < 0 || swapIdx >= resources.length) return;

    const a = resources[idx];
    const b = resources[swapIdx];

    setMovingResourceId(resourceId);
    try {
      const [updatedA, updatedB] = await Promise.all([
        courseStaff.updateModuleResource(courseId, module.id, a.id, { position: b.position }),
        courseStaff.updateModuleResource(courseId, module.id, b.id, { position: a.position }),
      ]);
      setResources((prev) =>
        prev
          .map((r) => (r.id === updatedA.id ? updatedA : r.id === updatedB.id ? updatedB : r))
          .sort((x, y) => x.position - y.position)
      );
    } catch (err) {
      reportError("Failed to reorder resource", err);
    } finally {
      setMovingResourceId(null);
    }
  }

  function requestDeleteResource(resourceId: number) {
    setConfirmDeleteResourceId(resourceId);
  }

  async function deleteResourceConfirmed() {
    if (confirmDeleteResourceId === null) return;
    setIsDeletingResource(true);
    try {
      await courseStaff.deleteModuleResource(courseId, module.id, confirmDeleteResourceId);
      setResources((prev) => prev.filter((r) => r.id !== confirmDeleteResourceId));
    } catch (err) {
      reportError("Failed to delete resource", err);
    } finally {
      setIsDeletingResource(false);
      setConfirmDeleteResourceId(null);
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
      reportError("Failed to download resource", err);
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  const deleteResourceTitle = useMemo(() => {
    if (confirmDeleteResourceId === null) return null;
    return resources.find((r) => r.id === confirmDeleteResourceId)?.title ?? null;
  }, [confirmDeleteResourceId, resources]);

  return (
    <>
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
            onClick={async (e) => {
              e.stopPropagation();
              if (!canMoveUp || isMovingModule) return;
              setIsMovingModule(true);
              try {
                await onMoveUp();
              } finally {
                setIsMovingModule(false);
              }
            }}
            disabled={!canMoveUp || isMovingModule}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Move module up"
            aria-label="Move module up"
          >
            <ArrowUp className="w-4 h-4" />
          </button>
          <button
            onClick={async (e) => {
              e.stopPropagation();
              if (!canMoveDown || isMovingModule) return;
              setIsMovingModule(true);
              try {
                await onMoveDown();
              } finally {
                setIsMovingModule(false);
              }
            }}
            disabled={!canMoveDown || isMovingModule}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
            title="Move module down"
            aria-label="Move module down"
          >
            <ArrowDown className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              setModuleEditError("");
              setShowEditModal(true);
            }}
            className="p-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              requestDeleteModule();
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

      <AnimatePresence>
        {showEditModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40"
            onClick={() => setShowEditModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: 12, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 12, scale: 0.98 }}
              transition={{ duration: 0.15 }}
              className="w-full max-w-md bg-[var(--background)] border border-[var(--border)] rounded-2xl shadow-xl"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-5 border-b border-[var(--border)] flex items-center justify-between">
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">Edit module</p>
                  <p className="text-xs text-[var(--muted-foreground)]">{module.title}</p>
                </div>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="p-2 rounded-xl hover:bg-[var(--card)] transition-colors"
                  aria-label="Close"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="p-5 space-y-4">
                {moduleEditError && (
                  <div className="p-3 rounded-xl bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 text-sm text-[var(--secondary)]">
                    {moduleEditError}
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Title</label>
                  <input
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Position</label>
                  <input
                    type="number"
                    value={editPosition}
                    onChange={(e) => setEditPosition(Number(e.target.value))}
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                </div>
              </div>

              <div className="p-5 border-t border-[var(--border)] flex items-center justify-end gap-2">
                <button
                  onClick={() => setShowEditModal(false)}
                  className="px-4 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-sm"
                >
                  Cancel
                </button>
                <button
                  onClick={saveModule}
                  disabled={isSavingModule || !editTitle.trim()}
                  className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors text-sm"
                >
                  {isSavingModule ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  Save
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

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
                {resources.map((resource, idx) => (
                  <div
                    key={resource.id}
                    className={`flex items-center gap-3 p-3 rounded-lg border transition-colors ${resource.is_published
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
                      {/* Reorder */}
                      <button
                        onClick={() => moveResource(resource.id, "up")}
                        disabled={idx === 0 || movingResourceId !== null}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Move up"
                        aria-label="Move resource up"
                      >
                        <ArrowUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => moveResource(resource.id, "down")}
                        disabled={idx === resources.length - 1 || movingResourceId !== null}
                        className="p-1.5 text-[var(--muted-foreground)] hover:text-[var(--foreground)] hover:bg-[var(--background)] rounded-lg transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                        title="Move down"
                        aria-label="Move resource down"
                      >
                        <ArrowDown className="w-4 h-4" />
                      </button>
                      {/* Publish/Unpublish */}
                      <button
                        onClick={() => handleTogglePublish(resource)}
                        className={`p-1.5 rounded-lg transition-colors ${resource.is_published
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
                        onClick={() => requestDeleteResource(resource.id)}
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

    <ConfirmModal
      isOpen={showDeleteModuleConfirm}
      onClose={() => setShowDeleteModuleConfirm(false)}
      onConfirm={() => void deleteModuleConfirmed()}
      title={`Delete \"${module.title}\"?`}
      description="This removes module content ordering (resources and assignments remain). Continue?"
      confirmLabel="Delete"
      confirmVariant="danger"
      isLoading={isDeletingModule}
    />

    <ConfirmModal
      isOpen={confirmDeleteResourceId !== null}
      onClose={() => setConfirmDeleteResourceId(null)}
      onConfirm={() => void deleteResourceConfirmed()}
      title={deleteResourceTitle ? `Delete \"${deleteResourceTitle}\"?` : "Delete resource?"}
      description="This cannot be undone. Continue?"
      confirmLabel="Delete"
      confirmVariant="danger"
      isLoading={isDeletingResource}
    />
    </>
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
  const fileInputRef = useRef<HTMLInputElement>(null);

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
            className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-colors ${file
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
