"use client";

import { motion } from "framer-motion";
import { AlertCircle, Building2, Check, Loader2, Save, Settings } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { ApiError, orgs, superadmin, type Organization } from "@/lib/api";
import { useAuthStore } from "@/lib/store";
import { PageHeader } from "@/components/shared/PageHeader";

export default function AdminSettingsPage() {
  const { user } = useAuthStore();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [selectedOrgId, setSelectedOrgId] = useState<number | null>(null);
  const [orgName, setOrgName] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);

  const adminOrgIds = useMemo(() => new Set(user?.org_admin_of ?? []), [user]);

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
      const storedOrgId =
        typeof window !== "undefined"
          ? Number(window.localStorage.getItem("marconi:admin_org_id") || "")
          : null;
      setSelectedOrgId((prev) => {
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
  }, [adminOrgIds, user]);

  const loadOrganization = useCallback(async (orgId: number) => {
    setError("");
    try {
      const org = await orgs.get(orgId);
      setOrgName(org.name);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to load organization");
    }
  }, []);

  useEffect(() => {
    void loadOrganizations();
  }, [loadOrganizations]);

  useEffect(() => {
    if (!selectedOrgId) return;
    void loadOrganization(selectedOrgId);
  }, [loadOrganization, selectedOrgId]);

  useEffect(() => {
    if (selectedOrgId && typeof window !== "undefined") {
      window.localStorage.setItem("marconi:admin_org_id", String(selectedOrgId));
    }
  }, [selectedOrgId]);

  async function save() {
    if (!selectedOrgId) return;
    const name = orgName.trim();
    if (name.length < 2) {
      setError("Organization name must be at least 2 characters.");
      return;
    }
    setIsSaving(true);
    setError("");
    setSaved(false);
    try {
      const updated = await orgs.update(selectedOrgId, { name });
      setOrgName(updated.name);
      setSaved(true);
      setTimeout(() => setSaved(false), 1500);
    } catch (err) {
      if (err instanceof ApiError) setError(err.detail);
      else setError("Failed to update organization");
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <PageHeader
        title="Settings"
        description="Organization configuration and admin preferences."
      />

      {error ? (
        <div className="p-4 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--secondary)] shrink-0 mt-0.5" />
          <p className="text-sm text-[var(--foreground)]">{error}</p>
        </div>
      ) : null}

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4 mb-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
              <Settings className="w-6 h-6 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <p className="text-[var(--foreground)] font-semibold">Organization</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Select an organization and update its name.
              </p>
            </div>
          </div>
        </div>

        <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
          Active organization
        </label>
        <div className="relative">
          <Building2 className="w-4 h-4 text-[var(--muted-foreground)] absolute left-3 top-1/2 -translate-y-1/2" />
          <select
            value={selectedOrgId ?? ""}
            onChange={(e) => setSelectedOrgId(e.target.value ? Number(e.target.value) : null)}
            className="w-full pl-10 pr-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          >
            {organizations.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name} (#{o.id})
              </option>
            ))}
          </select>
        </div>

        <div className="mt-6">
          <label className="block text-sm font-semibold text-[var(--foreground)] mb-2">
            Organization name
          </label>
          <input
            value={orgName}
            onChange={(e) => setOrgName(e.target.value)}
            placeholder="e.g. CEDAT — Marconi Lab"
            className="w-full px-3 py-2.5 bg-[var(--background)] border border-[var(--border)] rounded-xl text-[var(--foreground)] placeholder:text-[var(--muted-foreground)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)]"
          />
          <p className="text-xs text-[var(--muted-foreground)] mt-2">
            This name is shown to staff and students inside the workspace.
          </p>
        </div>

        <div className="mt-6 flex items-center justify-end gap-3">
          {saved ? (
            <div className="inline-flex items-center gap-2 text-emerald-700 bg-emerald-500/10 border border-emerald-200/60 px-3 py-2 rounded-xl text-sm font-semibold">
              <Check className="w-4 h-4" />
              Saved
            </div>
          ) : null}
          <button
            onClick={save}
            disabled={!selectedOrgId || isSaving}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white text-sm font-semibold hover:bg-[var(--primary-hover)] disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            {isSaving ? "Saving…" : "Save changes"}
          </button>
        </div>
      </motion.div>
    </div>
  );
}
