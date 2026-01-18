"use client";

import { motion } from "framer-motion";
import { Activity, AlertCircle, CheckCircle2, RefreshCw, Settings } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError, health } from "@/lib/api";

export default function SuperadminSettingsPage() {
  const [status, setStatus] = useState<null | { ok: boolean; checkedAt: string; detail?: string }>(null);
  const [isChecking, setIsChecking] = useState(false);

  async function checkHealth() {
    setIsChecking(true);
    try {
      const res = await health.get();
      setStatus({ ok: res.status === "ok", checkedAt: new Date().toISOString() });
    } catch (err) {
      if (err instanceof ApiError) {
        setStatus({ ok: false, checkedAt: new Date().toISOString(), detail: err.detail });
      } else {
        setStatus({ ok: false, checkedAt: new Date().toISOString(), detail: "Health check failed" });
      }
    } finally {
      setIsChecking(false);
    }
  }

  useEffect(() => {
    void checkHealth();
  }, []);

  const apiBase = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

  return (
    <div className="max-w-4xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
          System Settings
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Platform-wide diagnostics and configuration.
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
      >
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Settings className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <p className="text-sm font-semibold text-[var(--foreground)]">Diagnostics</p>
              <p className="text-sm text-[var(--muted-foreground)]">
                Verifies API connectivity and displays environment wiring.
              </p>
            </div>
          </div>

          <button
            onClick={checkHealth}
            disabled={isChecking}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            <RefreshCw className={`w-4 h-4 ${isChecking ? "animate-spin" : ""}`} />
            {isChecking ? "Checking…" : "Re-check"}
          </button>
        </div>

        <div className="mt-6 grid gap-4">
          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <p className="text-xs font-bold uppercase tracking-widest text-[var(--muted-foreground)] mb-2">
              API Base URL
            </p>
            <p className="text-sm font-semibold text-[var(--foreground)]">{apiBase}</p>
          </div>

          <div className="p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
            <div className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <Activity className="w-5 h-5 text-[var(--muted-foreground)]" />
                <div>
                  <p className="text-sm font-semibold text-[var(--foreground)]">API Health</p>
                  <p className="text-xs text-[var(--muted-foreground)]">Checked via /api/v1/health</p>
                </div>
              </div>
              {status ? (
                status.ok ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight text-green-600 bg-green-500/5 border-green-200/50">
                    <CheckCircle2 className="w-3 h-3" />
                    Operational
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight text-[var(--secondary)] bg-[var(--secondary)]/5 border-[var(--secondary)]/20">
                    <AlertCircle className="w-3 h-3" />
                    Down
                  </span>
                )
              ) : null}
            </div>
            {status?.detail ? (
              <p className="text-sm text-[var(--muted-foreground)] mt-3">{status.detail}</p>
            ) : null}
            {status?.checkedAt ? (
              <p className="text-xs text-[var(--muted-foreground)] mt-2">
                Last checked: {new Date(status.checkedAt).toLocaleString()}
              </p>
            ) : null}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
