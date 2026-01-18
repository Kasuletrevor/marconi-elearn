"use client";

import { motion } from "framer-motion";
import { LogOut, Mail, Settings, User } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { auth } from "@/lib/api";
import { useAuthStore } from "@/lib/store";

export default function StudentSettingsPage() {
  const router = useRouter();
  const { user, logout: logoutStore } = useAuthStore();
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await auth.logout();
    } catch {
      // Ignore errors, still logout locally.
    } finally {
      logoutStore();
      router.push("/login");
      setIsLoggingOut(false);
    }
  }

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
          Account profile and session controls.
        </p>
      </motion.div>

      <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center">
              <User className="w-6 h-6 text-[var(--muted-foreground)]" />
            </div>
            <div>
              <p className="text-[var(--foreground)] font-semibold">Your account</p>
              <div className="flex items-center gap-2 text-sm text-[var(--muted-foreground)] mt-1">
                <Mail className="w-4 h-4" />
                <span>{user?.email ?? "-"}</span>
              </div>
            </div>
          </div>
          <button
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-[var(--border)] text-sm font-semibold text-[var(--foreground)] hover:bg-[var(--background)] disabled:opacity-50"
          >
            <LogOut className="w-4 h-4" />
            {isLoggingOut ? "Logging out..." : "Logout"}
          </button>
        </div>

        <div className="mt-6 p-4 rounded-xl bg-[var(--background)] border border-[var(--border)]">
          <div className="flex items-center gap-2 mb-2">
            <Settings className="w-4 h-4 text-[var(--muted-foreground)]" />
            <p className="text-sm font-semibold text-[var(--foreground)]">Next</p>
          </div>
          <p className="text-sm text-[var(--muted-foreground)]">
            Password reset, editable profiles, and notification preferences will live here.
          </p>
        </div>
      </div>
    </div>
  );
}
