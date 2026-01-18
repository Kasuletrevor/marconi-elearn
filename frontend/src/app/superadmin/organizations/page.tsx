"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  Building2,
  Copy,
  Loader2,
  Mail,
  Plus,
  Search,
  X,
} from "lucide-react";
import { ApiError, orgs, staff, superadmin, type Organization } from "@/lib/api";
import { reportError } from "@/lib/reportError";

const fadeInUp = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0 },
};

function formatTimestamp(ts: string): string {
  const date = new Date(ts);
  if (Number.isNaN(date.getTime())) return ts;
  return date.toLocaleString();
}

export default function SuperadminOrganizationsPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [rows, setRows] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newOrgName, setNewOrgName] = useState("");
  const [newOrgAdminEmail, setNewOrgAdminEmail] = useState("");
  const [createError, setCreateError] = useState("");
  const [isCreating, setIsCreating] = useState(false);
  const [createResult, setCreateResult] = useState<{
    org: Organization;
    adminEmail: string | null;
    inviteLink: string | null;
  } | null>(null);
  const [copied, setCopied] = useState(false);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((o) => `${o.id} ${o.name}`.toLowerCase().includes(q));
  }, [rows, search]);

  async function load() {
    setIsLoading(true);
    setError("");
    try {
      const data = await superadmin.listOrganizations(0, 200);
      setRows(data);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load organizations");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (searchParams.get("new") === "1") {
      setIsCreateOpen(true);
      router.replace("/superadmin/organizations");
    }
  }, [router, searchParams]);

  async function createOrganization() {
    const name = newOrgName.trim();
    if (!name) {
      setCreateError("Organization name is required");
      return;
    }
    setIsCreating(true);
    setCreateError("");
    try {
      const adminEmail = newOrgAdminEmail.trim() || null;
      const createdOrg = await orgs.create({ name });

      let inviteLink: string | null = null;
      if (adminEmail) {
        const membership = await staff.addOrgMembershipByEmail(createdOrg.id, {
          email: adminEmail,
          role: "admin",
        });
        inviteLink = membership.invite_link ?? null;
      }

      setCreateResult({ org: createdOrg, adminEmail, inviteLink });
      setCopied(false);
      await load();
    } catch (err) {
      if (err instanceof ApiError) setCreateError(err.detail);
      else setCreateError("Failed to create organization");
    } finally {
      setIsCreating(false);
    }
  }

  async function copyCreatedInvite() {
    if (!createResult?.inviteLink) return;
    try {
      await navigator.clipboard.writeText(createResult.inviteLink);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch (err) {
      reportError("Failed to copy invite link", err);
    }
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="flex flex-col gap-3"
      >
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
            Organizations
          </h1>
          <p className="text-[var(--muted-foreground)] mt-1">
            Platform-wide organization directory (superadmin only).
          </p>
        </div>

        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name or ID..."
              className="w-full pl-10 pr-3 py-2.5 bg-[var(--card)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
            />
          </div>
          <button
            onClick={load}
            disabled={isLoading}
            className="px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            Refresh
          </button>
          <button
            type="button"
            onClick={() => setIsCreateOpen(true)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-sm"
          >
            <Plus className="w-4 h-4" />
            New organization
          </button>
        </div>
      </motion.div>

      <AnimatePresence>
        {isCreateOpen ? (
          <motion.div key="create-org" className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.button
              type="button"
              aria-label="Close modal"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (!isCreating) {
                  setIsCreateOpen(false);
                  setCreateError("");
                  setNewOrgName("");
                  setNewOrgAdminEmail("");
                  setCreateResult(null);
                  setCopied(false);
                }
              }}
              className="absolute inset-0 bg-black/50"
            />
            <motion.div
              initial={{ opacity: 0, y: 14, scale: 0.98 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 14, scale: 0.98 }}
              transition={{ duration: 0.18 }}
              className="relative w-full max-w-xl bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-xl overflow-hidden"
            >
              <div className="relative px-6 py-4 border-b border-[var(--border)] bg-[var(--background)]">
                <div className="absolute inset-0 pointer-events-none opacity-70">
                  <div className="absolute -top-24 -right-24 w-56 h-56 rounded-full bg-[var(--primary)]/20 blur-3xl" />
                  <div className="absolute -bottom-24 -left-24 w-56 h-56 rounded-full bg-[var(--secondary)]/20 blur-3xl" />
                </div>

                <div className="relative flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                      <Building2 className="w-5 h-5 text-[var(--primary)]" />
                    </div>
                    <div>
                      <p className="text-xs text-[var(--muted-foreground)]">Create</p>
                      <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
                        New organization
                      </h2>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCreating) {
                        setIsCreateOpen(false);
                        setCreateError("");
                        setNewOrgName("");
                        setNewOrgAdminEmail("");
                        setCreateResult(null);
                        setCopied(false);
                      }
                    }}
                    className="p-2 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors"
                    aria-label="Close"
                  >
                    <X className="w-4 h-4 text-[var(--muted-foreground)]" />
                  </button>
                </div>
              </div>

              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  if (!createResult) createOrganization();
                }}
                className="p-6"
              >
                {createError ? (
                  <div className="mb-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
                    {createError}
                  </div>
                ) : null}

                {createResult ? (
                  <div className="grid gap-4">
                    <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--background)]">
                      <p className="text-xs text-[var(--muted-foreground)]">Created</p>
                      <p className="text-lg font-semibold text-[var(--foreground)]">
                        {createResult.org.name}
                      </p>
                      <p className="text-xs text-[var(--muted-foreground)] mt-1">
                        Org #{createResult.org.id}
                      </p>
                    </div>

                    {createResult.adminEmail ? (
                      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)]">
                        <div className="flex items-start gap-3">
                          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                            <Mail className="w-5 h-5 text-[var(--primary)]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-medium text-[var(--foreground)]">
                              Org admin invited
                            </p>
                            <p className="text-xs text-[var(--muted-foreground)] truncate">
                              {createResult.adminEmail}
                            </p>
                            {createResult.inviteLink ? (
                              <p className="text-xs text-[var(--muted-foreground)] mt-2 truncate">
                                {createResult.inviteLink}
                              </p>
                            ) : (
                              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                                No invite link generated — they likely already have an account.
                              </p>
                            )}
                          </div>
                          {createResult.inviteLink ? (
                            <button
                              type="button"
                              onClick={copyCreatedInvite}
                              className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] transition-colors text-xs"
                            >
                              <Copy className="w-4 h-4" />
                              {copied ? "Copied" : "Copy"}
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ) : (
                      <div className="p-4 rounded-2xl border border-[var(--border)] bg-[var(--card)] text-sm text-[var(--muted-foreground)]">
                        Next: invite an org admin so they can create courses and manage members.
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3">
                      <Link
                        href={`/admin/members?org=${createResult.org.id}`}
                        className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors text-center text-sm"
                      >
                        Manage members
                      </Link>
                      <Link
                        href={`/admin/courses?org=${createResult.org.id}`}
                        className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors text-center text-sm"
                      >
                        Create courses
                      </Link>
                    </div>
                  </div>
                ) : null}

                {!createResult ? (
                  <div className="grid gap-4">
                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Organization name
                    </label>
                    <input
                      value={newOrgName}
                      onChange={(e) => setNewOrgName(e.target.value)}
                      placeholder="e.g. CEDAT — Marconi Lab"
                      autoFocus
                      className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      This creates a new workspace boundary for courses, members, and enrollments.
                    </p>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                      Initial org admin email (recommended)
                    </label>
                    <input
                      value={newOrgAdminEmail}
                      onChange={(e) => setNewOrgAdminEmail(e.target.value)}
                      inputMode="email"
                      placeholder="e.g. lecturer@university.edu"
                      className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                    />
                    <p className="mt-2 text-xs text-[var(--muted-foreground)]">
                      We&apos;ll add them as an org admin. If they don&apos;t have an account yet, we&apos;ll generate an invite link.
                    </p>
                  </div>
                </div>
                ) : null}

                <div className="mt-6 flex items-center justify-end gap-2">  
                  <button
                    type="button"
                    onClick={() => {
                      if (!isCreating) {
                        setIsCreateOpen(false);
                        setCreateError("");
                        setNewOrgName("");
                        setNewOrgAdminEmail("");
                        setCreateResult(null);
                        setCopied(false);
                      }
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] transition-colors"
                  >
                    {createResult ? "Close" : "Cancel"}
                  </button>
                  {!createResult ? (
                  <button
                    type="submit"
                    disabled={isCreating || !newOrgName.trim()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] disabled:opacity-60 disabled:cursor-not-allowed transition-colors"
                  >
                    {isCreating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    Create
                  </button>
                  ) : null}
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <AnimatePresence>
        {error ? (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 16 }}
            className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center"
          >
            <AlertCircle className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
            <p className="text-[var(--secondary)]">{error}</p>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <motion.div
        variants={fadeInUp}
        initial="hidden"
        animate="visible"
        className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
      >
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">
              Organizations
            </p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">
            {filtered.length} shown
          </span>
        </div>

        {isLoading ? (
          <div className="p-10 flex items-center justify-center">
            <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[var(--muted-foreground)]">
            No organizations found.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((org) => (
              <div
                key={org.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center gap-3 hover:bg-[var(--background)] transition-colors"
              >
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <Building2 className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {org.name}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)]">
                    Org #{org.id} · Updated {formatTimestamp(org.updated_at)}
                  </p>
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  Created {formatTimestamp(org.created_at)}
                </div>
                <div className="flex items-center gap-2 sm:ml-2">
                  <Link
                    href={`/admin/members?org=${org.id}`}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] text-xs text-[var(--foreground)] transition-colors"
                  >
                    Members
                  </Link>
                  <Link
                    href={`/admin/courses?org=${org.id}`}
                    className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] text-xs text-[var(--foreground)] transition-colors"
                  >
                    Courses
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
