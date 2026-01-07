"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { AlertCircle, Building2, Loader2, Search } from "lucide-react";
import { ApiError, superadmin, type Organization } from "@/lib/api";

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
  const [rows, setRows] = useState<Organization[]>([]);
  const [search, setSearch] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

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
        </div>
      </motion.div>

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
              </div>
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

