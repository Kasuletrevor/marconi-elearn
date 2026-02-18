"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { motion } from "framer-motion";
import { ClipboardList, Loader2, RefreshCw, Search } from "lucide-react";
import { useAuthStore } from "@/lib/store";
import { ApiError, audit, orgs, superadmin, type AuditEvent, type Organization } from "@/lib/api";

export default function AdminAuditPage() {
  const { user } = useAuthStore();
  const searchParams = useSearchParams();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [events, setEvents] = useState<AuditEvent[]>([]);
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(50);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");

  const adminOrgIds = useMemo(() => new Set(user?.org_admin_of ?? []), [user]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return events;
    return events.filter((e) =>
      `${e.action} ${e.actor_email ?? ""} ${e.target_type ?? ""} ${e.target_id ?? ""}`
        .toLowerCase()
        .includes(q)
    );
  }, [events, search]);

  const loadOrganizations = useCallback(async () => {
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
  }, [adminOrgIds, searchParams, user]);

  const loadEvents = useCallback(async (refresh = false) => {
    if (!selectedOrgId) return;
    if (refresh) setIsRefreshing(true);
    else setIsLoading(true);
    setError("");
    try {
      const rows = await audit.listOrgEvents(selectedOrgId, offset, limit);
      setEvents(rows);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load activity log");
    } finally {
      if (refresh) setIsRefreshing(false);
      else setIsLoading(false);
    }
  }, [limit, offset, selectedOrgId]);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (selectedOrgId && typeof window !== "undefined") {
      window.localStorage.setItem("marconi:admin_org_id", String(selectedOrgId));
    }
  }, [selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId) {
      void loadEvents(false);
    }
    else setEvents([]);
  }, [selectedOrgId, loadEvents]);

  useEffect(() => {
    setOffset(0);
  }, [selectedOrgId, limit]);

  if (isLoading && !user) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
              Activity log
            </h1>
            <p className="text-[var(--muted-foreground)] mt-1">
              Auditable actions for courses, memberships, roster imports, and grading.
            </p>
          </div>
          <button
            type="button"
            onClick={() => loadEvents(true)}
            disabled={isRefreshing || !selectedOrgId}
            className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--card)] hover:bg-[var(--background)] transition-colors text-sm disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <RefreshCw className="w-4 h-4" />
            {isRefreshing ? "Refreshing..." : "Refresh"}
          </button>
        </div>

        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-4">
          <div className="grid md:grid-cols-3 gap-3 items-end">
            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Organization
              </label>
              <select
                value={selectedOrgId ?? ""}
                onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
                className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
              >
                {organizations.length === 0 ? (
                  <option value="">No org access</option>
                ) : null}
                {organizations.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                Search
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[var(--muted-foreground)]" />
                <input
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Action, actor, target..."
                  className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                />
              </div>
            </div>

            <div className="flex items-center gap-2">
              <div className="flex-1">
                <label className="block text-xs font-medium text-[var(--muted-foreground)] mb-2">
                  Page size
                </label>
                <select
                  value={limit}
                  onChange={(e) => setLimit(Number(e.target.value))}
                  className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
                >
                  <option value={25}>25</option>
                  <option value={50}>50</option>
                  <option value={100}>100</option>
                </select>
              </div>
              <div className="flex items-end gap-1">
                <button
                  type="button"
                  onClick={() => setOffset((o) => Math.max(0, o - limit))}
                  disabled={offset === 0}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Prev
                </button>
                <button
                  type="button"
                  onClick={() => setOffset((o) => o + limit)}
                  disabled={events.length < limit}
                  className="px-3 py-2.5 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--card)] disabled:opacity-50 disabled:cursor-not-allowed text-sm"
                >
                  Next
                </button>
              </div>
            </div>
          </div>

          {error ? (
            <div className="mt-4 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)]">
              {error}
            </div>
          ) : null}
        </div>
      </motion.div>

      <motion.div variants={{ hidden: { opacity: 0, y: 14 }, visible: { opacity: 1, y: 0 } }} initial="hidden" animate="visible" className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        <div className="px-5 py-3 border-b border-[var(--border)] bg-[var(--background)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <ClipboardList className="w-4 h-4 text-[var(--muted-foreground)]" />
            <p className="text-sm font-medium text-[var(--foreground)]">Events</p>
          </div>
          <span className="text-xs text-[var(--muted-foreground)]">{filtered.length} shown</span>
        </div>

        {selectedOrgId === null ? (
          <div className="p-10 text-center text-[var(--muted-foreground)]">
            Select an organization to view its activity.
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-10 text-center text-[var(--muted-foreground)]">
            No events found.
          </div>
        ) : (
          <div className="divide-y divide-[var(--border)]">
            {filtered.map((e) => (
              <div key={e.id} className="px-5 py-4 flex flex-col md:flex-row md:items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-[var(--foreground)] truncate">
                    {e.action}
                  </p>
                  <p className="text-xs text-[var(--muted-foreground)] truncate">
                    {e.actor_email ?? "System"} {e.target_type ? `· ${e.target_type}` : ""}{e.target_id != null ? ` #${e.target_id}` : ""}
                  </p>
                  {e.metadata ? (
                    <p className="text-xs text-[var(--muted-foreground)] mt-1 truncate">
                      {JSON.stringify(e.metadata)}
                    </p>
                  ) : null}
                </div>
                <div className="text-xs text-[var(--muted-foreground)]">
                  {new Date(e.created_at).toLocaleString()}
                </div>
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}
