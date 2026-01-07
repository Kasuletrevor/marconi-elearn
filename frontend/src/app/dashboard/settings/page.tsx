"use client";

import { motion } from "framer-motion";
import { Settings } from "lucide-react";

export default function StudentSettingsPage() {
  return (
    <div className="max-w-3xl mx-auto">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-6"
      >
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
          Settings
        </h1>
        <p className="text-[var(--muted-foreground)] mt-1">
          Account settings are not implemented yet.
        </p>
      </motion.div>

      <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
        <div className="w-12 h-12 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center mb-4">
          <Settings className="w-6 h-6 text-[var(--muted-foreground)]" />
        </div>
        <p className="text-[var(--foreground)] font-medium mb-1">Coming soon</p>
        <p className="text-sm text-[var(--muted-foreground)]">
          Password reset, profile management, and notification preferences will
          live here.
        </p>
      </div>
    </div>
  );
}

