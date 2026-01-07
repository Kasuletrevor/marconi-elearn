"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  Building2,
  Users as UsersIcon,
  UserPlus,
  Loader2,
  AlertCircle,
  Plus,
  Trash2,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { orgs, staff, users, type Organization, type OrgMembership, ApiError } from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function roleLabel(role: OrgMembership["role"]): string {
  switch (role) {
    case "admin":
      return "Admin";
    case "lecturer":
      return "Lecturer";
    case "ta":
      return "TA";
  }
}

export default function AdminMembersPage() {
  const { user } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [userEmailById, setUserEmailById] = useState<Record<number, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [newUserId, setNewUserId] = useState("");
  const [newRole, setNewRole] = useState<OrgMembership["role"]>("lecturer");
  const [isAdding, setIsAdding] = useState(false);

  const adminOrgIds = useMemo(() => new Set(user?.org_admin_of ?? []), [user]);

  async function hydrateEmails(rows: OrgMembership[]) {
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
      // ignore
    }
  }

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

  async function loadMembers(orgId: number) {
    setError("");
    try {
      const rows = await staff.listOrgMemberships(orgId, 0, 500);
      setMemberships(rows);
      await hydrateEmails(rows);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load organization members");
    }
  }

  useEffect(() => {
    loadOrganizations();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  useEffect(() => {
    if (selectedOrgId) loadMembers(selectedOrgId);
    else setMemberships([]);
  }, [selectedOrgId]);

  async function addMember() {
    if (!selectedOrgId) return;
    const id = Number(newUserId);
    if (!id || Number.isNaN(id)) return;
    setIsAdding(true);
    setError("");
    try {
      const created = await staff.addOrgMembership(selectedOrgId, { user_id: id, role: newRole });
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

  async function updateRole(membershipId: number, role: OrgMembership["role"]) {
    if (!selectedOrgId) return;
    setError("");
    try {
      const updated = await staff.updateOrgMembership(selectedOrgId, membershipId, { role });
      setMemberships((prev) => prev.map((m) => (m.id === membershipId ? updated : m)));
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to update role");
    }
  }

  async function removeMember(membershipId: number) {
    if (!selectedOrgId) return;
    if (!confirm("Remove this user from the organization?")) return;
    setError("");
    try {
      await staff.removeOrgMembership(selectedOrgId, membershipId);
      setMemberships((prev) => prev.filter((m) => m.id !== membershipId));
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to remove member");
    }
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
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex items-start justify-between gap-4">
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
            Members
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Manage organization-level roles (admin / lecturer / TA).
          </p>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="grid md:grid-cols-3 gap-4">
        <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Organization</label>
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
          <p className="text-[10px] text-[var(--muted-foreground)] mt-2">
            Org roles control access to `/api/v1/orgs/*` admin routes.
          </p>
        </div>

        <div className="md:col-span-2 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-medium text-[var(--foreground)]">Add member</p>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Temporary input: user ID. Later we should support email-based invites.
              </p>
            </div>
          </div>

          <div className="mt-4 grid md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">User ID</label>
              <input
                value={newUserId}
                onChange={(e) => setNewUserId(e.target.value)}
                inputMode="numeric"
                placeholder="e.g. 42"
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as OrgMembership["role"])}
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                <option value="admin">{roleLabel("admin")}</option>
                <option value="lecturer">{roleLabel("lecturer")}</option>
                <option value="ta">{roleLabel("ta")}</option>
              </select>
            </div>
            <button
              onClick={addMember}
              disabled={!selectedOrgId || isAdding || !newUserId.trim()}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
            >
              {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
              Add
            </button>
          </div>
        </div>
      </motion.div>

      <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">Organization members</p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{memberships.length} total</span>
        </div>

        {selectedOrgId === null ? (
          <div className="p-8 text-center text-[var(--muted-foreground)]">Select an organization.</div>
        ) : memberships.length === 0 ? (
          <div className="p-10 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
              <UserPlus className="w-8 h-8 text-[var(--muted-foreground)]" />
            </div>
            <p className="text-[var(--foreground)] font-medium mb-1">No members found</p>
            <p className="text-sm text-[var(--muted-foreground)]">Add an admin/lecturer/TA to grant org access.</p>
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {memberships
              .slice()
              .sort((a, b) => a.id - b.id)
              .map((m) => (
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
                    onChange={(e) => updateRole(m.id, e.target.value as OrgMembership["role"])}
                    className="px-2.5 py-2 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                  >
                    <option value="admin">{roleLabel("admin")}</option>
                    <option value="lecturer">{roleLabel("lecturer")}</option>
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
      </motion.div>
    </div>
  );
}

