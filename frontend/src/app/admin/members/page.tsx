"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useSearchParams } from "next/navigation";
import {
  Building2,
  Users as UsersIcon,
  UserPlus,
  Loader2,
  AlertCircle,
  Plus,
  Copy,
  Mail,
  Trash2,
  ChevronDown,
  Check,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import {
  orgs,
  staff,
  superadmin,
  type Organization,
  type OrgMembership,
  ApiError,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";
import { DataList } from "@/components/shared/DataList";

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
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [memberships, setMemberships] = useState<OrgMembership[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [search, setSearch] = useState("");

  const [newEmail, setNewEmail] = useState("");
  const [newRole, setNewRole] = useState<OrgMembership["role"]>("lecturer");
  const [isAdding, setIsAdding] = useState(false);
  const [addResult, setAddResult] = useState<{
    email: string;
    inviteLink: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const adminOrgIds = useMemo(() => new Set(user?.org_admin_of ?? []), [user]);

  const filteredMemberships = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return memberships;
    return memberships.filter((m) => 
      (m.user_email?.toLowerCase().includes(q)) || 
      String(m.user_id).includes(q)
    );
  }, [memberships, search]);

  async function loadOrganizations() {
    if (!user) return;
    setIsLoading(true);
    setError("");
    try {
      const all = user.is_superadmin
        ? await superadmin.listOrganizations(0, 500)
        : await orgs.list();
      const mine = user.is_superadmin ? all : all.filter((o) => adminOrgIds.has(o.id));
      setOrganizations(mine);
      const qp = searchParams.get("org");
      const requestedOrgId = qp ? Number(qp) : null;
      const storedOrgId =
        typeof window !== "undefined"
          ? Number(window.localStorage.getItem("marconi:admin_org_id") || "")
          : null;
      setSelectedOrgId((prev) => {
        if (requestedOrgId && mine.some((o) => o.id === requestedOrgId)) return requestedOrgId;
        if (storedOrgId && mine.some((o) => o.id === storedOrgId)) return storedOrgId;
        if (prev && mine.some((o) => o.id === prev)) return prev;
        return mine[0]?.id ?? null;
      });
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

  useEffect(() => {
    if (selectedOrgId && typeof window !== "undefined") {
      window.localStorage.setItem("marconi:admin_org_id", String(selectedOrgId));
    }
  }, [selectedOrgId]);

  async function addMember() {
    if (!selectedOrgId) return;
    const email = newEmail.trim();
    if (!email) return;
    setIsAdding(true);
    setError("");
    setAddResult(null);
    setCopied(false);
    try {
      const created = await staff.addOrgMembershipByEmail(selectedOrgId, { email, role: newRole });
      const next = [...memberships, created];
      setMemberships(next);
      setNewEmail("");
      const nextInviteLink = created.invite_link ?? null;
      setAddResult({ email, inviteLink: nextInviteLink });
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to add member");
    } finally {
      setIsAdding(false);
    }
  }

  async function copyInvite() {
    if (!addResult?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(addResult.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // ignore
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
      <EmptyState
        icon={AlertCircle}
        title="Error"
        description={error}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <PageHeader
        title="Members"
        description="Manage organization-level roles (admin / lecturer / TA)."
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-6">
          <div className="p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
            <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">Organization</label>
            <div className="relative">
              <Building2 className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
              <select
                value={selectedOrgId ?? ""}
                onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
                className="w-full pl-10 pr-8 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] appearance-none"
              >
                {organizations.length === 0 && <option value="">No org access</option>}
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)] pointer-events-none" />
            </div>
          </div>

          <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm">
            <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-1">Add Member</h3>
            <p className="text-xs text-[var(--muted-foreground)] mb-4">
              Add by email to grant organization access.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Email Address</label>
                <input
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  inputMode="email"
                  placeholder="lecturer@university.edu"
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-1.5">Role</label>
                <select
                  value={newRole}
                  onChange={(e) => setNewRole(e.target.value as OrgMembership["role"])}
                  className="w-full px-3 py-2 bg-[var(--background)] border border-[var(--border)] rounded-xl text-sm text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value="admin">{roleLabel("admin")}</option>
                  <option value="lecturer">{roleLabel("lecturer")}</option>
                  <option value="ta">{roleLabel("ta")}</option>
                </select>
              </div>
              <button
                onClick={addMember}
                disabled={!selectedOrgId || isAdding || !newEmail.trim()}
                className="w-full inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors font-medium shadow-sm"
              >
                {isAdding ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4" />}
                Add Member
              </button>
            </div>

            <AnimatePresence>
              {addResult && (
                <motion.div
                  initial={{ opacity: 0, height: 0, marginTop: 0 }}
                  animate={{ opacity: 1, height: "auto", marginTop: 16 }}
                  exit={{ opacity: 0, height: 0, marginTop: 0 }}
                  className="p-4 rounded-xl border border-[var(--border)] bg-[var(--background)] overflow-hidden"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                      <Mail className="w-4 h-4 text-[var(--primary)]" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-semibold text-[var(--foreground)]">
                        {addResult.inviteLink ? "Invite link generated" : "User added to org"}
                      </p>
                      {addResult.inviteLink ? (
                        <>
                          <p className="text-[10px] text-[var(--muted-foreground)] truncate mt-0.5">
                            {addResult.inviteLink}
                          </p>
                          <button
                            onClick={copyInvite}
                            className="mt-2 inline-flex items-center gap-1.5 text-[10px] font-medium text-[var(--primary)] hover:underline"
                          >
                            {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                            {copied ? "Copied!" : "Copy Link"}
                          </button>
                        </>
                      ) : (
                        <p className="text-[10px] text-[var(--muted-foreground)] mt-1">
                          They can log in now using their existing password.
                        </p>
                      )}
                    </div>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        <div className="lg:col-span-2">
          <DataList
            search={{
              value: search,
              onChange: setSearch,
              placeholder: "Search members by email or ID...",
            }}
            header={
              <div className="flex items-center gap-2">
                <UsersIcon className="w-4 h-4 text-[var(--muted-foreground)]" />
                <h3 className="text-sm font-medium text-[var(--foreground)]">Organization Members</h3>
                <span className="px-2 py-0.5 rounded-full bg-[var(--background)] border border-[var(--border)] text-[10px] text-[var(--muted-foreground)] font-mono">
                  {memberships.length}
                </span>
              </div>
            }
          >
            {selectedOrgId === null ? (
              <EmptyState
                icon={Building2}
                title="No organization selected"
                description="Select an organization from the sidebar to view members."
              />
            ) : filteredMemberships.length === 0 ? (
              <EmptyState
                icon={UsersIcon}
                title="No members found"
                description={search ? `No members matching "${search}"` : "Add the first member to this organization."}
              />
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                {filteredMemberships
                  .slice()
                  .sort((a, b) => a.id - b.id)
                  .map((m) => (
                    <motion.div 
                      key={m.id} 
                      layout
                      className="px-5 py-4 flex items-center gap-4 hover:bg-[var(--background)] transition-colors group"
                    >
                      <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/5 border border-[var(--primary)]/10 flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)]/10 transition-colors">
                        <UsersIcon className="w-5 h-5 text-[var(--primary)]" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {m.user_email ?? `User #${m.user_id}`}
                        </p>
                        <p className="text-[10px] text-[var(--muted-foreground)] font-mono">ID: {m.user_id}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <select
                          value={m.role}
                          onChange={(e) => updateRole(m.id, e.target.value as OrgMembership["role"])}
                          className="px-3 py-1.5 text-xs bg-[var(--background)] border border-[var(--border)] rounded-lg text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] cursor-pointer hover:border-[var(--primary)]/30 transition-colors"
                        >
                          <option value="admin">{roleLabel("admin")}</option>
                          <option value="lecturer">{roleLabel("lecturer")}</option>
                          <option value="ta">{roleLabel("ta")}</option>
                        </select>
                        <button
                          onClick={() => removeMember(m.id)}
                          className="p-2 rounded-lg text-[var(--muted-foreground)] hover:text-[var(--secondary)] hover:bg-[var(--secondary)]/10 transition-all opacity-0 group-hover:opacity-100"
                          aria-label="Remove member"
                          title="Remove Member"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </motion.div>
                  ))}
              </div>
            )}
          </DataList>
        </div>
      </div>
    </div>
  );
}
