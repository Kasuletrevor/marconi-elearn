"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import Link from "next/link";
import {
  BookOpen,
  Users,
  UserPlus,
  Building2,
  Clock,
  ArrowRight,
  Loader2,
  AlertCircle,
  ChevronRight,
  Plus,
  ArrowUpRight,
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import {
  orgs,
  staff,
  type Organization,
  type Course,
  ApiError,
} from "@/lib/api";
import { PageHeader } from "@/components/admin/PageHeader";
import { EmptyState } from "@/components/admin/EmptyState";

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

interface OrgData {
  organization: Organization;
  courses: Course[];
  memberCounts: Record<number, { students: number; staff: number }>;
}

export default function AdminDashboardPage() {
  const { user } = useAuthStore();
  const [orgDataList, setOrgDataList] = useState<OrgData[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchOrgData() {
      if (!user || user.org_admin_of.length === 0) {
        setIsLoading(false);
        return;
      }

      try {
        const allOrgs = await orgs.list();
        const adminOrgs = allOrgs.filter((org) =>
          user.org_admin_of.includes(org.id)
        );

        const orgDataPromises = adminOrgs.map(async (org) => {
          const courses = await staff.listCourses(org.id);
          const memberCounts: Record<number, { students: number; staff: number }> = {};
          await Promise.all(
            courses.map(async (course) => {
              try {
                const memberships = await staff.listMemberships(org.id, course.id);
                const students = memberships.filter((m) => m.role === "student").length;
                const staffCount = memberships.filter((m) => m.role !== "student").length;
                memberCounts[course.id] = { students, staff: staffCount };
              } catch {
                memberCounts[course.id] = { students: 0, staff: 0 };
              }
            })
          );

          return {
            organization: org,
            courses,
            memberCounts,
          };
        });

        const results = await Promise.all(orgDataPromises);
        setOrgDataList(results);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError("Failed to load dashboard data");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrgData();
  }, [user]);

  const totalCourses = orgDataList.reduce((sum, od) => sum + od.courses.length, 0);
  const totalStudents = orgDataList.reduce(
    (sum, od) =>
      sum +
      Object.values(od.memberCounts).reduce((s, mc) => s + mc.students, 0),
    0
  );
  const totalStaff = orgDataList.reduce(
    (sum, od) =>
      sum +
      Object.values(od.memberCounts).reduce((s, mc) => s + mc.staff, 0),
    0
  );

  const stats = [
    {
      label: "Active Courses",
      value: isLoading ? "..." : totalCourses.toString(),
      icon: BookOpen,
      color: "var(--primary)",
    },
    {
      label: "Enrolled Students",
      value: isLoading ? "..." : totalStudents.toString(),
      icon: Users,
      color: "var(--secondary)",
    },
    {
      label: "Staff Members",
      value: isLoading ? "..." : totalStaff.toString(),
      icon: UserPlus,
      color: "var(--primary)",
    },
    {
      label: "Organizations",
      value: isLoading ? "..." : orgDataList.length.toString(),
      icon: Building2,
      color: "var(--secondary)",
    },
  ];

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <EmptyState
        icon={AlertCircle}
        title="Dashboard Error"
        description={error}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <PageHeader
        title="Admin Dashboard"
        description="Monitor platform activity and manage your institutional resources."
      />

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeInUp}
            className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm hover:shadow-md transition-shadow relative overflow-hidden group"
          >
            <div
              className="absolute -right-2 -top-2 opacity-[0.03] group-hover:opacity-[0.06] transition-opacity"
              aria-hidden="true"
            >
              <stat.icon size={80} />
            </div>
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4 border border-white/50"
              style={{
                backgroundColor: `color-mix(in srgb, ${stat.color} 10%, transparent)`,
              }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
              {stat.value}
            </p>
            <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mt-1">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Organizations and Courses */}
        <div className="lg:col-span-2 space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
              Institutional Context
            </h2>
            <Link href="/admin/courses" className="text-xs font-medium text-[var(--primary)] hover:underline flex items-center gap-1">
              View all courses <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {orgDataList.length === 0 ? (
            <EmptyState
              icon={Building2}
              title="No organizations assigned"
              description="You currently don't have administrative access to any organizations."
            />
          ) : (
            <div className="space-y-6">
              {orgDataList.map((orgData) => (
                <OrgCard key={orgData.organization.id} orgData={orgData} />
              ))}
            </div>
          )}
        </div>

        {/* Sidebar Actions */}
        <div className="space-y-6">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
            Command Center
          </h2>
          <div className="grid gap-3">
            <QuickActionLink
              href="/admin/courses"
              title="Course Registry"
              description="Deploy and manage academic courses"
              icon={BookOpen}
            />
            <QuickActionLink
              href="/admin/members"
              title="Personnel"
              description="Manage faculty and staff roles"
              icon={UserPlus}
            />
            <QuickActionLink
              href="/admin/audit"
              title="Activity Ledger"
              description="Review institutional audit events"
              icon={Clock}
            />
          </div>

          <div className="p-6 bg-[var(--primary)] text-white rounded-2xl shadow-lg relative overflow-hidden group">
            <div className="absolute top-0 right-0 p-4 opacity-20 group-hover:scale-110 transition-transform">
              <Plus size={40} />
            </div>
            <h3 className="font-semibold mb-2">Expanding?</h3>
            <p className="text-xs text-white/80 mb-4 leading-relaxed">
              Create a new course context to start distributing assignments and collecting submissions.
            </p>
            <Link
              href="/admin/courses"
              className="inline-flex items-center gap-2 px-4 py-2 bg-white text-[var(--primary)] rounded-xl text-xs font-bold hover:bg-white/90 transition-colors"
            >
              Initialize Course
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}

function QuickActionLink({ href, title, description, icon: Icon }: { href: string; title: string; description: string; icon: any }) {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/30 hover:shadow-md transition-all"
    >
      <div className="w-10 h-10 rounded-xl bg-[var(--background)] border border-[var(--border)] flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
        <Icon className="w-5 h-5" />
      </div>
      <div className="min-w-0">
        <p className="font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors flex items-center gap-1">
          {title}
          <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
        </p>
        <p className="text-xs text-[var(--muted-foreground)] line-clamp-1">{description}</p>
      </div>
    </Link>
  );
}

interface OrgCardProps {
  orgData: OrgData;
}

function OrgCard({ orgData }: OrgCardProps) {
  const { organization, courses, memberCounts } = orgData;
  const totalStudents = Object.values(memberCounts).reduce(
    (sum, mc) => sum + mc.students,
    0
  );
  const totalStaff = Object.values(memberCounts).reduce(
    (sum, mc) => sum + mc.staff,
    0
  );

  return (
    <motion.div
      variants={fadeInUp}
      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden shadow-sm"
    >
      {/* Org Header */}
      <div className="p-5 bg-[var(--background)] border-b border-[var(--border)]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
              <Building2 className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <h3 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
                {organization.name}
              </h3>
              <p className="text-[10px] uppercase tracking-widest text-[var(--muted-foreground)] font-medium">
                {courses.length} course{courses.length !== 1 ? "s" : ""} &bull;{" "}
                {totalStudents} student{totalStudents !== 1 ? "s" : ""} &bull;{" "}
                {totalStaff} staff
              </p>
            </div>
          </div>
          <Link
            href={`/admin/courses?org=${organization.id}`}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-bold text-[var(--primary)] border border-[var(--primary)]/20 hover:bg-[var(--primary)]/5 rounded-lg transition-colors"
          >
            Manage Registry
          </Link>
        </div>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="p-8 text-center bg-[var(--background)]/50">
          <p className="text-xs text-[var(--muted-foreground)]">
            No courses initialized in this organization.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]/50">
          {courses.slice(0, 3).map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              orgId={organization.id}
              memberCount={memberCounts[course.id] || { students: 0, staff: 0 }}
            />
          ))}
          {courses.length > 3 && (
            <Link
              href={`/admin/courses?org=${organization.id}`}
              className="block p-3 text-center text-[10px] font-bold text-[var(--muted-foreground)] hover:text-[var(--primary)] hover:bg-[var(--background)] transition-colors uppercase tracking-widest"
            >
              View {courses.length - 3} more courses
            </Link>
          )}
        </div>
      )}
    </motion.div>
  );
}

interface CourseRowProps {
  course: Course;
  orgId: number;
  memberCount: { students: number; staff: number };
}

function CourseRow({ course, orgId, memberCount }: CourseRowProps) {
  return (
    <Link
      href={`/staff/courses/${course.id}`}
      className="group flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
    >
      <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/5 flex items-center justify-center shrink-0 group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
        <BookOpen className="w-4 h-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-[10px] font-mono bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded uppercase tracking-tighter">
            {course.code}
          </span>
          {course.semester && (
            <span className="text-[10px] text-[var(--muted-foreground)] font-medium">
              {course.semester} {course.year}
            </span>
          )}
        </div>
        <h4 className="text-sm font-semibold text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
          {course.title}
        </h4>
      </div>
      <div className="text-right shrink-0">
        <p className="text-[10px] font-bold text-[var(--foreground)]">{memberCount.students}</p>
        <p className="text-[10px] text-[var(--muted-foreground)] uppercase tracking-tighter font-medium">Students</p>
      </div>
      <ChevronRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all shrink-0" />
    </Link>
  );
}
