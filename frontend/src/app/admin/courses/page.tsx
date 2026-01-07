"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  BookOpen,
  Plus,
  Loader2,
  AlertCircle,
  Building2,
  Pencil,
  Users as UsersIcon,
  UserPlus,
  Trash2,
  ChevronDown,
  ChevronUp,
  Search,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import {
  orgs,
  staff,
  users,
  type Course,
  type CourseMembership,
  type CourseMembershipCreate,
  type CourseMembershipUpdate,
  type Organization,
  ApiError,
} from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

type StaffRole = "owner" | "co_lecturer" | "ta";

function roleLabel(role: CourseMembership["role"]): string {
  switch (role) {
    case "owner":
      return "Owner";
    case "co_lecturer":
      return "Co‑lecturer";
    case "ta":
      return "TA";
    case "student":
      return "Student";
  }
}

function formatCourseMeta(course: Course): string {
  const parts: string[] = [];
  if (course.semester) parts.push(course.semester);
  if (course.year) parts.push(String(course.year));
  return parts.length ? parts.join(" · ") : "—";
}

export default function AdminCoursesPage() {
  const { user } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [courses, setCourses] = useState<Course[]>([]);
  const [expandedCourseIds, setExpandedCourseIds] = useState<Set<number>>(new Set());
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [modal, setModal] = useState<null | { kind: "create" } | { kind: "edit"; course: Course }>(null);

  const adminOrgIds = useMemo(() => new Set(user?.org_admin_of ?? []), [user]);
  const filteredCourses = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return courses;
    return courses.filter((c) => `${c.code} ${c.title}`.toLowerCase().includes(q));
  }, [courses, search]);

  async function loadOrganizations() {
    if (!user) return;
    setIsLoading(true);
    setError("");
    try {
      const all = await orgs.list();
      const mine = all.filter((o) => adminOrgIds.has(o.id));
      setOrganizations(mine);
      setSelectedOrgId((prev) => (prev && mine.some((o) => o.id === prev) ? prev : mine[0]?.id ?? null));
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  }

  async function loadCourses(orgId: number) {
    setError("");
    try {
      const data = await staff.listCourses(orgId);
      setCourses(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load courses");
    }
  }

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (selectedOrgId) loadCourses(selectedOrgId);
    else setCourses([]);
  }, [selectedOrgId]);

  function toggleExpanded(courseId: number) {
    setExpandedCourseIds((prev) => {
      const next = new Set(prev);
      if (next.has(courseId)) next.delete(courseId);
      else next.add(courseId);
      return next;
    });
  }

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
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center"
        >
          <AlertCircle className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
          <p className="text-[var(--secondary)]">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
              Courses
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1">
              Create courses, set semester/year, and assign staff roles.
            </p>
          </div>
          <button
            onClick={() => setModal({ kind: "create" })}
            disabled={!selectedOrgId}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
          >
            <Plus className="w-4 h-4" />
            New course
          </button>
        </div>

        <div className="grid md:grid-cols-3 gap-4">
          <div className="md:col-span-1 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Organization
            </label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <select
                value={selectedOrgId ?? ""}
                onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
                className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {organizations.length === 0 && <option value="">No org access</option>}
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-[var(--muted-foreground)] mt-2">
              Tip: You can manage org members in{" "}
              <Link href="/admin/members" className="text-[var(--primary)] hover:underline">
                Members
              </Link>
              .
            </p>
          </div>

          <div className="md:col-span-2 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
              Search
            </label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Find by code or title…"
                className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>
        </div>
      </motion.div>

      {selectedOrgId === null && (
        <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center text-[var(--muted-foreground)]">
          You don&apos;t have org admin access yet.
        </div>
      )}

      {selectedOrgId !== null && filteredCourses.length === 0 && (
        <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="p-10 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
            <BookOpen className="w-8 h-8 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-2">
            No courses found
          </h2>
          <p className="text-[var(--muted-foreground)]">Create the first course for this organization.</p>
        </motion.div>
      )}

      {selectedOrgId !== null && filteredCourses.length > 0 && (
        <div className="space-y-3">
          {filteredCourses.map((course) => (
            <CourseCard
              key={course.id}
              orgId={selectedOrgId}
              course={course}
              isExpanded={expandedCourseIds.has(course.id)}
              onToggle={() => toggleExpanded(course.id)}
              onEdit={() => setModal({ kind: "edit", course })}
              onDeleted={async () => loadCourses(selectedOrgId)}
            />
          ))}
        </div>
      )}

      <AnimatePresence>
        {modal && selectedOrgId !== null && (
          <CourseModal
            key={modal.kind === "create" ? "create" : `edit-${modal.course.id}`}
            orgId={selectedOrgId}
            mode={modal.kind}
            course={modal.kind === "edit" ? modal.course : undefined}
            onClose={() => setModal(null)}
            onSaved={async () => {
              setModal(null);
              await loadCourses(selectedOrgId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

function CourseCard(props: {
  orgId: number;
  course: Course;
  isExpanded: boolean;
  onToggle: () => void;
  onEdit: () => void;
  onDeleted: () => Promise<void>;
}) {
  const { orgId, course, isExpanded, onToggle, onEdit, onDeleted } = props;
  const [memberships, setMemberships] = useState<CourseMembership[]>([]);
  const [userEmailById, setUserEmailById] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<StaffRole>("ta");
  const [isAdding, setIsAdding] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const staffMembers = memberships.filter((m) => m.role !== "student");

  async function hydrateEmails(rows: CourseMembership[]) {
    const ids = Array.from(new Set(rows.map((m) => m.user_id))).filter((id) => !userEmailById[id]);
    if (ids.length === 0) return;
    try {
      const pairs = await Promise.all(ids.map(async (id) => [id, (await users.get(id)).email] as const));
      setUserEmailById((prev) => {
        const next = { ...prev };
        for (const [id, email] of pairs) next[id] = email;
        return next;
      });
    } catch {
      // ignore email hydration failures
    }
  }

  async function loadRoster() {
    setIsLoading(true);
    setError("");
    try {
      const rows = await staff.listMemberships(orgId, course.id, 0, 500);
      setMemberships(rows);
      await hydrateEmails(rows);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load course memberships");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    if (isExpanded) loadRoster();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isExpanded]);

  async function addStaff() {
    const id = Number(newUserId);
    if (!id || Number.isNaN(id)) return;
    setIsAdding(true);
    setError("");
    try {
      const payload: CourseMembershipCreate = { user_id: id, role: newRole };
      const created = await staff.enrollUser(orgId, course.id, payload);
      const next = [...memberships, created];
      setMemberships(next);
      setNewUserId("");
      await hydrateEmails(next);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to add member");
    } finally {
      setIsAdding(false);
    }
  }

  async function updateRole(membershipId: number, role: CourseMembership["role"]) {
    setError("");
    try {
      const payload: CourseMembershipUpdate = { role };
      const updated = await staff.updateMembership(orgId, course.id, membershipId, payload);
      setMemberships((prev) => prev.map((m) => (m.id === membershipId ? updated : m)));
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to update role");
    }
  }

  async function removeMember(membershipId: number) {
    if (!confirm("Remove this member from the course?")) return;
    setError("");
    try {
      await staff.removeMembership(orgId, course.id, membershipId);
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to remove member");
    }
  }

  async function deleteCourse() {
    if (!confirm(`Delete ${course.code}? This removes course data.`)) return;
    setIsDeleting(true);
    try {
      await staff.deleteCourse(orgId, course.id);
      await onDeleted();
    } catch (err) {
      // ignore
    } finally {
      setIsDeleting(false);
    }
  }

  return (
    <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
      <div className="p-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
              <BookOpen className="w-6 h-6 text-[var(--primary)]" />
            </div>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center px-2 py-1 rounded-lg bg-[var(--background)] border border-[var(--border)] text-xs text-[var(--muted-foreground)]">
                  {course.code}
                </span>
                <span className="text-xs text-[var(--muted-foreground)]">{formatCourseMeta(course)}</span>
              </div>
              <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] truncate">
                {course.title}
              </h3>
            </div>
          </div>
          {course.description && (
            <p className="text-sm text-[var(--muted-foreground)] line-clamp-2">{course.description}</p>
          )}
          <div className="mt-3 flex items-center gap-2 text-xs text-[var(--muted-foreground)]">
            <UsersIcon className="w-4 h-4" />
            <span>{staffMembers.length} staff</span>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={onEdit}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors"
            aria-label="Edit course"
            title="Edit course"
          >
            <Pencil className="w-4 h-4" />
          </button>
          <button
            onClick={deleteCourse}
            disabled={isDeleting}
            className="p-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors disabled:opacity-60"
            aria-label="Delete course"
            title="Delete course"
          >
            {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4 text-[var(--secondary)]" />}
          </button>
          <button
            onClick={onToggle}
            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
          >
            <UserPlus className="w-4 h-4 text-[var(--primary)]" />
            Staff roles
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="border-t border-[var(--border)] bg-[var(--background)]"
          >
            <div className="p-5">
              {error && (
                <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
                  {error}
                </div>
              )}

              <div className="grid md:grid-cols-3 gap-3 items-end">
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">User ID</label>
                  <input
                    value={newUserId}
                    onChange={(e) => setNewUserId(e.target.value)}
                    inputMode="numeric"
                    placeholder="e.g. 42"
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  />
                  <p className="mt-2 text-[10px] text-[var(--muted-foreground)]">
                    Use `Users` API to look up IDs (temporary).
                  </p>
                </div>
                <div>
                  <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as StaffRole)}
                    className="w-full px-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="owner">Owner</option>
                    <option value="co_lecturer">Co‑lecturer</option>
                    <option value="ta">TA</option>
                  </select>
                </div>
                <button
                  onClick={addStaff}
                  disabled={isAdding || !newUserId.trim()}
                  className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                >
                  {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                  Add
                </button>
              </div>

              <div className="mt-5 bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="px-5 py-3 border-b border-[var(--border)] flex items-center justify-between">
                  <p className="text-sm font-medium text-[var(--foreground)]">Course staff</p>
                  <button
                    onClick={loadRoster}
                    disabled={isLoading}
                    className="text-xs text-[var(--muted-foreground)] hover:text-[var(--foreground)] transition-colors"
                  >
                    {isLoading ? "Refreshing…" : "Refresh"}
                  </button>
                </div>
                {isLoading ? (
                  <div className="p-8 flex items-center justify-center">
                    <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                  </div>
                ) : staffMembers.length === 0 ? (
                  <div className="p-8 text-center text-[var(--muted-foreground)]">No staff assigned yet.</div>
                ) : (
                  <div className="divide-y divide-[var(--border)]">
                    {staffMembers.map((m) => (
                      <div key={m.id} className="px-5 py-3 flex items-center gap-3 hover:bg-[var(--background)] transition-colors">
                        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                          <UsersIcon className="w-5 h-5 text-[var(--primary)]" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium text-[var(--foreground)] truncate">
                            {userEmailById[m.user_id] ?? `User #${m.user_id}`}
                          </p>
                          <p className="text-xs text-[var(--muted-foreground)]">User ID: {m.user_id}</p>
                        </div>
                        <select
                          value={m.role}
                          onChange={(e) => updateRole(m.id, e.target.value as CourseMembership["role"])}
                          className="px-2.5 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                        >
                          <option value="owner">{roleLabel("owner")}</option>
                          <option value="co_lecturer">{roleLabel("co_lecturer")}</option>
                          <option value="ta">{roleLabel("ta")}</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.id)}
                          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 transition-colors"
                          aria-label="Remove member"
                          title="Remove"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

function CourseModal(props: {
  orgId: number;
  mode: "create" | "edit";
  course?: Course;
  onClose: () => void;
  onSaved: () => Promise<void>;
}) {
  const { orgId, mode, course, onClose, onSaved } = props;
  const [code, setCode] = useState(course?.code ?? "");
  const [title, setTitle] = useState(course?.title ?? "");
  const [description, setDescription] = useState(course?.description ?? "");
  const [semester, setSemester] = useState(course?.semester ?? "");
  const [year, setYear] = useState(course?.year ? String(course.year) : "");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function save() {
    setError("");
    setIsSaving(true);
    try {
      const parsedYear = year.trim() === "" ? null : Number(year);
      if (year.trim() !== "" && Number.isNaN(parsedYear)) {
        setError("Year must be a number");
        setIsSaving(false);
        return;
      }
      if (mode === "create") {
        await staff.createCourse(orgId, {
          code: code.trim(),
          title: title.trim(),
          description: description.trim() === "" ? null : description.trim(),
          semester: semester.trim() === "" ? null : semester.trim(),
          year: parsedYear,
        });
      } else if (course) {
        await staff.updateCourse(orgId, course.id, {
          code: code.trim(),
          title: title.trim(),
          description: description.trim() === "" ? null : description.trim(),
          semester: semester.trim() === "" ? null : semester.trim(),
          year: parsedYear,
        });
      }
      await onSaved();
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to save course");
      setIsSaving(false);
    }
  }

  return (
    <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/50"
      />
      <motion.div
        initial={{ opacity: 0, y: 16, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 16, scale: 0.98 }}
        transition={{ duration: 0.18 }}
        className="relative w-full max-w-2xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden"
      >
        <div className="px-6 py-4 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
          <div>
            <p className="text-xs text-[var(--muted-foreground)]">{mode === "create" ? "Create course" : "Edit course"}</p>
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
              {mode === "create" ? "New course" : course?.code}
            </h2>
          </div>
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors text-sm"
          >
            Close
          </button>
        </div>

        <div className="p-6">
          {error && (
            <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
              {error}
            </div>
          )}

          <div className="grid md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Code</label>
              <input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="e.g. CS101"
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Title</label>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="e.g. Introduction to Programming"
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Semester</label>
              <input
                value={semester}
                onChange={(e) => setSemester(e.target.value)}
                placeholder="e.g. Sem 2"
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Year</label>
              <input
                value={year}
                onChange={(e) => setYear(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 2026"
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Description</label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Optional…"
                rows={4}
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
          </div>

          <div className="mt-6 flex items-center justify-end gap-2">
            <button
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
            >
              Cancel
            </button>
            <button
              onClick={save}
              disabled={isSaving || !code.trim() || !title.trim()}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Pencil className="w-4 h-4" />}
              Save
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

