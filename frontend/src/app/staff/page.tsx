"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  Users,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Loader2,
  Calendar,
} from "lucide-react";
import { useAuthStore, getStaffCourseIds, getCourseRole } from "@/lib/store";
import { student, type Course, ApiError } from "@/lib/api";

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

export default function StaffDashboardPage() {
  const { user } = useAuthStore();
  const staffCourseIds = getStaffCourseIds(user);
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCourses() {
      try {
        // Use student API to get courses (works for staff too since they have membership)
        const allCourses = await student.getCourses();
        // Filter to only courses where user is staff
        const staffCourses = allCourses.filter((c) =>
          staffCourseIds.includes(c.id)
        );
        setCourses(staffCourses);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError("Failed to load courses");
        }
      } finally {
        setIsLoading(false);
      }
    }

    if (staffCourseIds.length > 0) {
      fetchCourses();
    } else {
      setIsLoading(false);
    }
  }, [staffCourseIds]);

  // TODO: Fetch real stats from API
  const stats = [
    {
      label: "Pending Reviews",
      value: "—",
      icon: FileText,
      color: "var(--secondary)",
    },
    {
      label: "Graded Today",
      value: "—",
      icon: CheckCircle,
      color: "#22c55e",
    },
    {
      label: "At-Risk Students",
      value: "—",
      icon: AlertTriangle,
      color: "#f59e0b",
    },
    {
      label: "Active Courses",
      value: String(staffCourseIds.length),
      icon: BookOpen,
      color: "var(--primary)",
    },
  ];

  const quickActions = [
    { label: "Review Submissions", href: "/staff/submissions", icon: FileText },
    { label: "View At-Risk", href: "/staff/at-risk", icon: AlertTriangle },
  ];

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
          Staff Dashboard
        </h1>
        <p className="text-[var(--muted-foreground)]">
          Manage submissions, assignments, and student progress
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
        <div className="grid md:grid-cols-2 gap-4">
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

      {/* My Courses */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-4">
          My Courses
        </h2>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          </div>
        ) : error ? (
          <div className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center">
            <p className="text-[var(--secondary)]">{error}</p>
          </div>
        ) : courses.length === 0 ? (
          <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl p-8 text-center">
            <BookOpen className="w-10 h-10 text-[var(--muted-foreground)] mx-auto mb-4" />
            <p className="text-[var(--muted-foreground)]">
              No courses assigned yet
            </p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {courses.map((course) => (
              <CourseCard key={course.id} course={course} user={user} />
            ))}
          </div>
        )}
      </motion.div>
    </div>
  );
}

interface CourseCardProps {
  course: Course;
  user: { course_roles: { course_id: number; role: string }[] } | null;
}

function CourseCard({ course, user }: CourseCardProps) {
  const role = getCourseRole(user as any, course.id);

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    co_lecturer: "Co-Lecturer",
    ta: "Teaching Assistant",
    student: "Student",
  };

  return (
    <Link
      href={`/staff/courses/${course.id}`}
      className="group p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/30 hover:shadow-lg transition-all"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center">
          <BookOpen className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <span className="text-xs font-medium px-2 py-1 rounded-md bg-[var(--primary)]/10 text-[var(--primary)]">
          {role ? roleLabels[role] || role : "Staff"}
        </span>
      </div>
      <div className="mb-3">
        <span className="text-xs font-medium text-[var(--muted-foreground)] bg-[var(--background)] px-2 py-0.5 rounded">
          {course.code}
        </span>
      </div>
      <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors leading-tight">
        {course.title}
      </h3>
      {course.description && (
        <p className="text-sm text-[var(--muted-foreground)] mt-2 line-clamp-2">
          {course.description}
        </p>
      )}
      <div className="flex items-center gap-4 mt-4 pt-4 border-t border-[var(--border)]">
        {course.semester && course.year && (
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)]">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {course.semester}, {course.year}
            </span>
          </div>
        )}
        <ArrowRight className="w-4 h-4 ml-auto text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
