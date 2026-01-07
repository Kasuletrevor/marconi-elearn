"use client";

import { motion } from "framer-motion";
import { ClipboardList } from "lucide-react";

export default function AdminAuditPage() {
  return (
    <div className="max-w-4xl mx-auto">
      <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} className="p-10 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
        <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
          <ClipboardList className="w-8 h-8 text-[var(--muted-foreground)]" />
        </div>
        <h1 className="font-[family-name:var(--font-display)] text-2xl font-semibold text-[var(--foreground)] mb-2">
          Activity log
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Coming soon: audit events for course creation, role changes, roster imports, grading actions.
        </p>
      </motion.div>
    </div>
  );
}

