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
} from "lucide-react";
import { useAuthStore } from "@/lib/store";
import {
  orgs,
  staff,
  type Organization,
  type Course,
  type CourseMembership,
  ApiError,
} from "@/lib/api";

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
        // Fetch all organizations the user is admin of
        const allOrgs = await orgs.list();
        const adminOrgs = allOrgs.filter((org) =>
          user.org_admin_of.includes(org.id)
        );

        // Fetch courses for each org
        const orgDataPromises = adminOrgs.map(async (org) => {
          const courses = await staff.listCourses(org.id);

          // Fetch membership counts for each course
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
          setError("Failed to load organization data");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchOrgData();
  }, [user]);

  // Calculate totals
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
      label: "Total Students",
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

  const quickActions = [
    { label: "Create Course", href: "/admin/courses/new", icon: BookOpen },
    { label: "Invite Staff", href: "/admin/members/invite", icon: UserPlus },
    { label: "View Activity", href: "/admin/audit", icon: Clock },
  ];

  // Loading state
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center"
        >
          <AlertCircle className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
          <p className="text-[var(--secondary)]">{error}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
          Organization Overview
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Manage courses, staff, and organization settings
        </p>
      </motion.div>

      {/* Stats Grid */}
      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8"
      >
        {stats.map((stat) => (
          <motion.div
            key={stat.label}
            variants={fadeInUp}
            className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
          >
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
              style={{
                backgroundColor: `color-mix(in srgb, ${stat.color} 15%, transparent)`,
              }}
            >
              <stat.icon className="w-5 h-5" style={{ color: stat.color }} />
            </div>
            <p className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)]">
              {stat.value}
            </p>
            <p className="text-sm text-[var(--muted-foreground)]">{stat.label}</p>
          </motion.div>
        ))}
      </motion.div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mb-8"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-4">
          Quick Actions
        </h2>
        <div className="grid md:grid-cols-3 gap-4">
          {quickActions.map((action) => (
            <Link
              key={action.label}
              href={action.href}
              className="group flex items-center gap-4 p-4 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)]/30 hover:shadow-lg transition-all"
            >
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
                <action.icon className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <span className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
                {action.label}
              </span>
              <ArrowRight className="w-4 h-4 ml-auto text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
            </Link>
          ))}
        </div>
      </motion.div>

      {/* Organizations and Courses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="space-y-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
          Your Organizations
        </h2>

        {orgDataList.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <Building2 className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)]">
              No organizations found
            </p>
          </div>
        ) : (
          orgDataList.map((orgData) => (
            <OrgCard key={orgData.organization.id} orgData={orgData} />
          ))
        )}
      </motion.div>
    </div>
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
      className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
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
              <p className="text-sm text-[var(--muted-foreground)]">
                {courses.length} course{courses.length !== 1 ? "s" : ""} &bull;{" "}
                {totalStudents} student{totalStudents !== 1 ? "s" : ""} &bull;{" "}
                {totalStaff} staff
              </p>
            </div>
          </div>
          <Link
            href={`/admin/courses/new?org=${organization.id}`}
            className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Add Course</span>
          </Link>
        </div>
      </div>

      {/* Courses List */}
      {courses.length === 0 ? (
        <div className="p-8 text-center">
          <BookOpen className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-2" />
          <p className="text-[var(--muted-foreground)]">
            No courses yet. Create your first course!
          </p>
        </div>
      ) : (
        <div className="divide-y divide-[var(--border)]">
          {courses.map((course) => (
            <CourseRow
              key={course.id}
              course={course}
              orgId={organization.id}
              memberCount={memberCounts[course.id] || { students: 0, staff: 0 }}
            />
          ))}
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
      href={`/staff/courses/${course.id}?org=${orgId}`}
      className="group flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
    >
      <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
        <BookOpen className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-0.5">
          <span className="text-xs font-medium bg-[var(--muted)] text-[var(--muted-foreground)] px-2 py-0.5 rounded">
            {course.code}
          </span>
          {course.semester && course.year && (
            <span className="text-xs text-[var(--muted-foreground)]">
              {course.semester} {course.year}
            </span>
          )}
        </div>
        <h4 className="font-medium text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
          {course.title}
        </h4>
        <p className="text-xs text-[var(--muted-foreground)] mt-0.5">
          {memberCount.students} student{memberCount.students !== 1 ? "s" : ""}{" "}
          &bull; {memberCount.staff} staff
        </p>
      </div>
      <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all shrink-0" />
    </Link>
  );
}
