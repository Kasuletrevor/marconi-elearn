"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import {
  Building2,
  Users,
  BookOpen,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Clock,
  ArrowRight,
  GraduationCap,
} from "lucide-react";
import { ApiError, superadmin, type SuperadminStats } from "@/lib/api";

const fadeInUp = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

const staggerContainer = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.08, delayChildren: 0.1 },
  },
};

// Placeholder metrics - will be fetched from API
const metrics = [
  { label: "Organizations", value: "—", icon: Building2, trend: null },
  { label: "Total Users", value: "—", icon: Users, trend: null },
  { label: "Active Courses", value: "—", icon: BookOpen, trend: null },
  { label: "Submissions Today", value: "—", icon: TrendingUp, trend: null },
];

// Placeholder system status
const systemStatus = [
  { service: "API Server", status: "healthy" },
  { service: "Database", status: "healthy" },
  { service: "JOBE Server", status: "pending" },
  { service: "Email Service", status: "healthy" },
];

export default function SuperadminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SuperadminStats | null>(null);
  const [metricsError, setMetricsError] = useState("");

  useEffect(() => {
    async function load() {
      setMetricsError("");
      try {
        const data = await superadmin.getStats();
        setStats(data);
      } catch (err) {
        if (err instanceof ApiError) setMetricsError(err.detail);
        else setMetricsError("Failed to load metrics");
      }
    }
    load();
  }, []);

  const liveMetrics = [
    {
      label: "Organizations",
      value: stats ? String(stats.organizations_total) : "—",
      icon: Building2,
    },
    { label: "Total Users", value: stats ? String(stats.users_total) : "—", icon: Users },
    { label: "Active Courses", value: stats ? String(stats.courses_total) : "—", icon: BookOpen },
    { label: "Submissions Today", value: stats ? String(stats.submissions_today) : "—", icon: TrendingUp },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
          Platform Overview
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Monitor and manage the Marconi Elearn platform
        </p>
      </motion.div>

      {/* Metrics Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {liveMetrics.map((metric) => (
          <motion.div
            key={metric.label}
            variants={fadeInUp}
            className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
                <metric.icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
            </div>
            <p className="text-2xl font-bold text-[var(--foreground)] mb-1">
              {metric.value}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">
              {metric.label}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {metricsError ? (
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6 p-4 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 text-[var(--secondary)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Metrics unavailable</p>
            <p className="text-sm text-[var(--muted-foreground)]">{metricsError}</p>
          </div>
        </motion.div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-6">
        {/* System Status */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
        >
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
            System Status
          </h2>
          <div className="space-y-3">
            {systemStatus.map((item) => (
              <div
                key={item.service}
                className="flex items-center justify-between p-3 bg-[var(--background)] rounded-xl"
              >
                <span className="text-[var(--foreground)]">{item.service}</span>
                <StatusBadge status={item.status} />
              </div>
            ))}
          </div>
        </motion.div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
        >
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-4">
            Quick Actions
          </h2>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => router.push("/superadmin/organizations?new=1")}
              className="w-full flex items-center gap-3 p-4 bg-[var(--background)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <Building2 className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--foreground)]">
                  Create Organization
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Add a new organization to the platform
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/members")}
              className="w-full flex items-center gap-3 p-4 bg-[var(--background)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--secondary)]/10 flex items-center justify-center">
                <Users className="w-5 h-5 text-[var(--secondary)]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--foreground)]">
                  Add Org Staff
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Add lecturers/TAs/admins to an organization
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
            <button
              type="button"
              onClick={() => router.push("/admin/courses")}
              className="w-full flex items-center gap-3 p-4 bg-[var(--background)] hover:bg-[var(--primary)]/5 border border-[var(--border)] hover:border-[var(--primary)]/30 rounded-xl transition-all text-left"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <GraduationCap className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div className="flex-1">
                <p className="font-medium text-[var(--foreground)]">
                  Create Courses
                </p>
                <p className="text-sm text-[var(--muted-foreground)]">
                  Create courses and assign course staff roles
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)]" />
            </button>
          </div>
        </motion.div>
      </div>

      {/* Info Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="mt-6 p-4 bg-[var(--primary)]/5 border border-[var(--primary)]/20 rounded-xl flex items-start gap-3"
      >
        <AlertCircle className="w-5 h-5 text-[var(--primary)] shrink-0 mt-0.5" />
        <div>
          <p className="text-sm text-[var(--foreground)]">
            <strong>Platform Admin View</strong>
          </p>
          <p className="text-sm text-[var(--muted-foreground)]">
            This dashboard provides platform-wide metrics and management
            capabilities. Organization-specific management is available in the
            Organization Admin dashboard.
          </p>
        </div>
      </motion.div>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: typeof CheckCircle2; className: string; label: string }
  > = {
    healthy: {
      icon: CheckCircle2,
      className: "text-green-600 bg-green-500/10",
      label: "Healthy",
    },
    degraded: {
      icon: AlertCircle,
      className: "text-amber-600 bg-amber-500/10",
      label: "Degraded",
    },
    pending: {
      icon: Clock,
      className: "text-[var(--muted-foreground)] bg-[var(--muted-foreground)]/10",
      label: "Not Configured",
    },
    down: {
      icon: AlertCircle,
      className: "text-[var(--secondary)] bg-[var(--secondary)]/10",
      label: "Down",
    },
  };

  const { icon: Icon, className, label } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium ${className}`}
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </span>
  );
}
