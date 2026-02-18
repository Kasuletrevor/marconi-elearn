"use client";

import { useEffect, useState, type ComponentType } from "react";
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
  Activity,
  Settings,
  ShieldCheck,
  Zap,
} from "lucide-react";
import { ApiError, health, superadmin, type SuperadminStats } from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";

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

type ServiceStatus = "healthy" | "degraded" | "pending" | "down";
type StatusIcon = ComponentType<{ className?: string }>;
interface SystemStatusItem {
  service: string;
  status: ServiceStatus;
  icon: StatusIcon;
  hint?: string;
}

export default function SuperadminPage() {
  const router = useRouter();
  const [stats, setStats] = useState<SuperadminStats | null>(null);
  const [metricsError, setMetricsError] = useState("");
  const [systemStatus, setSystemStatus] = useState<SystemStatusItem[]>([
    {
      service: "API",
      status: "pending",
      icon: Zap,
      hint: "Checked via /api/v1/health",
    },
    {
      service: "Database",
      status: "pending",
      icon: Activity,
      hint: "Checked via superadmin telemetry read",
    },
    {
      service: "JOBE Sandbox",
      status: "pending",
      icon: ShieldCheck,
      hint: "Not wired to an API check yet",
    },
    {
      service: "SMTP Relay",
      status: "pending",
      icon: CheckCircle2,
      hint: "Not wired to an API check yet",
    },
  ]);
  const [systemSummary, setSystemSummary] = useState<{
    label: string;
    className: string;
  }>({
    label: "Checking status…",
    className:
      "text-[10px] font-bold text-[var(--muted-foreground)] uppercase tracking-widest bg-[var(--background)] px-2 py-1 rounded-full border border-[var(--border)]",
  });

  useEffect(() => {
    async function load() {
      setMetricsError("");
      try {
        const [healthRes, data] = await Promise.all([
          health.get(),
          superadmin.getStats(),
        ]);
        setStats(data);
        setSystemStatus((prev) => {
          const apiOk = healthRes?.status === "ok";
          return prev.map((s) => {
            if (s.service === "API") return { ...s, status: apiOk ? "healthy" : "down" };
            if (s.service === "Database") return { ...s, status: "healthy" };
            return s;
          });
        });
        setSystemSummary({
          label: "Core Services Operational",
          className:
            "text-[10px] font-bold text-[var(--success)] uppercase tracking-widest bg-[var(--success)]/10 px-2 py-1 rounded-full border border-[var(--success)]/20",
        });
      } catch (err) {
        if (err instanceof ApiError) setMetricsError(err.detail);
        else setMetricsError("Failed to load metrics");
        setSystemStatus((prev) =>
          prev.map((s) => {
            if (s.service === "API") return { ...s, status: "down" };
            if (s.service === "Database") return { ...s, status: "degraded" };
            return s;
          })
        );
        setSystemSummary({
          label: "Degraded",
          className:
            "text-[10px] font-bold text-[var(--warning)] uppercase tracking-widest bg-[var(--warning)]/10 px-2 py-1 rounded-full border border-[var(--warning)]/20",
        });
      }
    }
    load();
  }, []);

  const liveMetrics = [
    {
      label: "Institutions",
      value: stats ? String(stats.organizations_total) : "—",
      icon: Building2,
      color: "var(--primary)",
    },
    { label: "Platform Users", value: stats ? String(stats.users_total) : "—", icon: Users, color: "var(--secondary)" },
    { label: "Academic Courses", value: stats ? String(stats.courses_total) : "—", icon: BookOpen, color: "var(--primary)" },
    { label: "Submissions (24h)", value: stats ? String(stats.submissions_today) : "—", icon: TrendingUp, color: "var(--secondary)" },
  ] as const;

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <PageHeader
        title="Platform Control Deck"
        description="Global oversight and infrastructure management for Marc-Elearn."
      />

      {/* Metrics Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {liveMetrics.map((metric) => (
          <motion.div
            key={metric.label}
            variants={fadeInUp}
            className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden group"
          >
            <div
              className="absolute -right-2 -top-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
              aria-hidden="true"
            >
              <metric.icon size={80} />
            </div>
            <div className="flex items-center gap-3 mb-4">
              <div 
                className="w-10 h-10 rounded-xl flex items-center justify-center border border-white/50"
                style={{
                  backgroundColor: `color-mix(in srgb, ${metric.color} 10%, transparent)`,
                }}
              >
                <metric.icon className="w-5 h-5" style={{ color: metric.color }} />
              </div>
            </div>
            <p className="text-3xl font-bold text-[var(--foreground)] mb-1 font-[family-name:var(--font-display)]">
              {metric.value}
            </p>
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-widest">
              {metric.label}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {metricsError ? (
        <div className="p-4 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-[var(--secondary)] shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-medium text-[var(--foreground)]">Telemetry partially offline</p>
            <p className="text-xs text-[var(--muted-foreground)]">{metricsError}</p>
          </div>
        </div>
      ) : null}

      <div className="grid lg:grid-cols-2 gap-8">
        {/* System Health */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          <div className="flex items-center justify-between px-2">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
              Infrastructure Health
            </h2>
            <span className={systemSummary.className}>{systemSummary.label}</span>
          </div>
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm">
            <div className="divide-y divide-[var(--border)]/50">
              {systemStatus.map((item) => (
                <div
                  key={item.service}
                  className="flex items-center justify-between p-4 bg-[var(--background)]/30 hover:bg-[var(--background)] transition-colors"
                  title={item.hint || ""}
                >
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-lg bg-white border border-[var(--border)] flex items-center justify-center">
                      <item.icon className="w-4 h-4 text-[var(--muted-foreground)]" />
                    </div>
                    <span className="text-sm font-medium text-[var(--foreground)]">{item.service}</span>
                  </div>
                  <StatusBadge status={item.status} />
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        {/* Global Operations */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-4"
        >
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] px-2">
            Platform Operations
          </h2>
          <div className="grid gap-3">
            <OperationButton
              onClick={() => router.push("/superadmin/organizations?new=1")}
              title="Onboard Institution"
              description="Initialize a new organizational tenant"
              icon={Building2}
            />
            <OperationButton
              onClick={() => router.push("/admin/members")}
              title="Assign Platform Staff"
              description="Manage global administrative privileges"
              icon={ShieldCheck}
            />
            <OperationButton
              onClick={() => router.push("/superadmin/settings")}
              title="Global Parameters"
              description="Configure platform-wide environment variables"
              icon={Settings}
            />
          </div>
        </motion.div>
      </div>

      {/* Audit & Transparency */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="p-6 bg-[var(--primary)] text-white rounded-2xl shadow-xl relative overflow-hidden group"
      >
        <div className="absolute right-0 top-0 p-8 opacity-10 group-hover:scale-110 transition-transform">
          <ShieldCheck size={120} />
        </div>
        <div className="max-w-2xl">
          <h3 className="text-xl font-semibold mb-2">Governance & Oversight</h3>
          <p className="text-sm text-white/80 mb-6 leading-relaxed">
            The platform admin view provides unrestricted access to all data. Every action taken from this dashboard is recorded in the global immutable audit ledger for institutional compliance.
          </p>
          <div className="flex gap-3">
            <button
              className="px-4 py-2 bg-white text-[var(--primary)] rounded-xl text-xs font-bold opacity-60 cursor-not-allowed"
              disabled
              title="Not implemented yet"
            >
              Access Global Ledger
            </button>
            <button
              className="px-4 py-2 bg-[var(--primary-hover)] text-white border border-white/20 rounded-xl text-xs font-bold opacity-60 cursor-not-allowed"
              disabled
              title="Not implemented yet"
            >
              Export Transparency Report
            </button>
          </div>
        </div>
      </motion.div>
    </div>
  );
}

function OperationButton({ onClick, title, description, icon: Icon }: { onClick: () => void; title: string; description: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <button
      onClick={onClick}
      className="w-full flex items-center gap-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/30 hover:shadow-md transition-all text-left group"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors shadow-sm">
        <Icon className="w-5 h-5" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
          {title}
        </p>
        <p className="text-xs text-[var(--muted-foreground)] truncate">{description}</p>
      </div>
      <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
    </button>
  );
}

function StatusBadge({ status }: { status: string }) {
  const config: Record<
    string,
    { icon: typeof CheckCircle2; className: string; label: string }
  > = {
    healthy: {
      icon: CheckCircle2,
      className: "text-[var(--success)] bg-[var(--success)]/10 border-[var(--success)]/20",
      label: "Operational",
    },
    degraded: {
      icon: AlertCircle,
      className: "text-[var(--warning)] bg-[var(--warning)]/10 border-[var(--warning)]/20",
      label: "Latency Detected",
    },
    pending: {
      icon: Clock,
      className: "text-[var(--muted-foreground)] bg-[var(--muted-foreground)]/5 border-[var(--border)]",
      label: "Provisioning",
    },
    down: {
      icon: AlertCircle,
      className: "text-[var(--secondary)] bg-[var(--secondary)]/5 border-[var(--secondary)]/20",
      label: "Critical Failure",
    },
  };

  const { icon: Icon, className, label } = config[status] || config.pending;

  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-[10px] font-bold uppercase tracking-tight ${className}`}
    >
      <Icon className="w-3 h-3" />
      {label}
    </span>
  );
}
