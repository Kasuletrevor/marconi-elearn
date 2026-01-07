"use client";

import { motion } from "framer-motion";
import { Settings } from "lucide-react";

export default function SuperadminSettingsPage() {
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
          Platform-wide configuration (coming soon).
        </p>
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <Settings className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Not implemented yet</p>
            <p className="text-sm text-[var(--muted-foreground)]">
              Next: email provider config, JOBE integration status, and audit exports.
            </p>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

