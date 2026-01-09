import React from "react";
import { LucideIcon } from "lucide-react";
import { motion } from "framer-motion";

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description: string;
  action?: React.ReactNode;
}

export function EmptyState({ icon: Icon, title, description, action }: EmptyStateProps) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className="flex flex-col items-center justify-center p-12 text-center bg-[var(--card)] border border-[var(--border)] rounded-2xl"
    >
      <div className="w-16 h-16 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center mb-6">
        <Icon className="w-8 h-8 text-[var(--muted-foreground)]" />
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-2">
        {title}
      </h3>
      <p className="text-[var(--muted-foreground)] max-w-sm mb-6">
        {description}
      </p>
      {action}
    </motion.div>
  );
}
