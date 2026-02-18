"use client";

import React, { useCallback, useEffect, useState } from "react";
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
  Clock,
  ChevronRight,
  ChevronLeft,
  ArrowRight,
  ExternalLink,
  Filter,
  RefreshCw,
  Pencil,
  Save,
  Trash2,
  Copy,
  UserX,
  Beaker,
  X,
  ChevronDown,
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
import { RosterTab } from "@/components/staff/course/RosterTab";
import { ModulesTab } from "@/components/staff/course/ModulesTab";

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
    { id: "modules", label: "Modules", icon: FolderOpen },
    { id: "assignments", label: "Assignments", icon: FileText },
    { id: "submissions", label: "Submissions", icon: FileText },
    { id: "roster", label: "Roster", icon: Users },
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
    { label: "Upcoming", value: upcomingAssignments.length, icon: Clock, color: "var(--warning)" },
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
                  <div className="w-10 h-10 rounded-lg bg-[var(--warning)]/10 flex items-center justify-center shrink-0">
                    <Clock className="w-5 h-5 text-[var(--warning)]" />
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
  pending: { label: "Pending", className: "bg-[var(--warning)]/10 text-[var(--warning)] border-[var(--warning)]/20" },
  grading: { label: "Grading", className: "bg-[var(--info)]/10 text-[var(--info)] border-[var(--info)]/20" },
  graded: { label: "Graded", className: "bg-[var(--success)]/10 text-[var(--success)] border-[var(--success)]/20" },
  error: { label: "Error", className: "bg-[var(--secondary)]/10 text-[var(--secondary)] border-[var(--secondary)]/20" },
};

function CourseSubmissionsTab({ courseId }: CourseSubmissionsTabProps) {
  const router = useRouter();
  const [items, setItems] = useState<StaffSubmissionQueueItem[]>([]);
  const [total, setTotal] = useState(0);
  const [statusFilter, setStatusFilter] = useState<StaffSubmissionQueueItem["status"] | "all">("pending");
  const [offset, setOffset] = useState(0);
  const limit = 25;
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

  const fetchQueue = useCallback(async (refresh = false) => {
    try {
      setError("");
      if (refresh) setIsRefreshing(true);
      else setIsLoading(true);
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
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [courseId, limit, offset, statusFilter]);

  useEffect(() => {
    void fetchQueue(false);
  }, [fetchQueue]);

  useEffect(() => {
    setOffset(0);
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
                  <div className="p-2 bg-[var(--success)]/10 rounded-lg border border-[var(--success)]/20"><p className="font-bold text-[var(--success)]">{active.submitted_count}</p><p className="text-[10px] text-[var(--success)] uppercase">Done</p></div>
                  <div className="p-2 bg-[var(--warning)]/10 rounded-lg border border-[var(--warning)]/20"><p className="font-bold text-[var(--warning)]">{active.missing_count}</p><p className="text-[10px] text-[var(--warning)] uppercase">Missing</p></div>
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
  const [newAutogradeMode, setNewAutogradeMode] = useState<
    "practice_only" | "final_only" | "hybrid"
  >("practice_only");
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
    setNewAutogradeMode("practice_only");
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
    setNewAutogradeMode(assignment.autograde_mode ?? "practice_only");
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
        autograde_mode: newAutogradeMode,
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
                <p className="required-hint">* Required fields</p>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="md:col-span-2">
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Title
                    </label>
                    <input
                      value={newTitle}
                      onChange={(e) => setNewTitle(e.target.value)}
                      placeholder="e.g. Assignment 1: Hello World"
                      required
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
                        .sort((a, b) => a.position - b.position || a.id - b.id)
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
                      required
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
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Autograding mode
                    </label>
                    <select
                      value={newAutogradeMode}
                      onChange={(e) =>
                        setNewAutogradeMode(e.target.value as "practice_only" | "final_only" | "hybrid")
                      }
                      required
                      className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    >
                      <option value="practice_only">Practice only (grade on submit)</option>
                      <option value="final_only">Final only (grade at deadline)</option>
                      <option value="hybrid">Hybrid (practice on submit + final at deadline)</option>
                    </select>
                    <p className="mt-1 text-xs text-[var(--muted-foreground)]">
                      Use hybrid for instant feedback + authoritative deadline grading.
                    </p>
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
