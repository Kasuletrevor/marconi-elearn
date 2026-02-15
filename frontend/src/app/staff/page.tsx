"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  FileText,
  AlertTriangle,
  ArrowRight,
  CheckCircle,
  Loader2,
  Calendar,
  Clock3,
} from "lucide-react";
import { useAuthStore, getCourseRole } from "@/lib/store";
import {
  courseStaff,
  staffSubmissions,
  type Course,
  ApiError,
  type User as ApiUser,
  type StaffCalendarEvent,
} from "@/lib/api";
import { PageHeader } from "@/components/shared/PageHeader";
import { EmptyState } from "@/components/shared/EmptyState";

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
  const [courses, setCourses] = useState<Course[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");
  const [queueTotals, setQueueTotals] = useState<{
    pending: number;
    grading: number;
    graded: number;
    error: number;
  } | null>(null);
  const [upcomingDeadlines, setUpcomingDeadlines] = useState<StaffCalendarEvent[]>([]);

  useEffect(() => {
    async function fetchCourses() {
      try {
        if (!user) return;
        const nowIso = new Date().toISOString();
        const [staffCourses, calendarEvents] = await Promise.all([
          courseStaff.listCourses(),
          courseStaff.getCalendarEvents({ starts_at: nowIso, limit: 1000 }),
        ]);
        setCourses(staffCourses);
        const upcoming = calendarEvents
          .sort(
            (a, b) =>
              new Date(a.due_date).getTime() - new Date(b.due_date).getTime()
          )
          .slice(0, 5);
        setUpcomingDeadlines(upcoming);

        try {
          const [pendingPage, gradingPage, errorPage, gradedPage] = await Promise.all([
            staffSubmissions.listPage({ status: "pending", limit: 1, offset: 0 }),
            staffSubmissions.listPage({ status: "grading", limit: 1, offset: 0 }),
            staffSubmissions.listPage({ status: "error", limit: 1, offset: 0 }),
            staffSubmissions.listPage({ status: "graded", limit: 1, offset: 0 }),
          ]);
          setQueueTotals({
            pending: pendingPage.total,
            grading: gradingPage.total,
            error: errorPage.total,
            graded: gradedPage.total,
          });
        } catch {
          setQueueTotals(null);
        }
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

    fetchCourses();
  }, [user]);

  const formatCount = (n: number | null | undefined) => {
    if (n === null || n === undefined) return "—";
    return n > 999 ? "999+" : String(n);
  };

  const stats = [
    {
      label: "Pending",
      value: formatCount(queueTotals?.pending),
      icon: FileText,
      color: "var(--secondary)",
      href: "/staff/submissions?status=pending",
    },
    {
      label: "Grading",
      value: formatCount(queueTotals?.grading),
      icon: CheckCircle,
      color: "var(--success)",
      href: "/staff/submissions?status=grading",
    },
    {
      label: "Needs attention",
      value: formatCount(queueTotals?.error),
      icon: AlertTriangle,
      color: "var(--warning)",
      href: "/staff/submissions?status=error",
    },
    {
      label: "Active Courses",
      value: String(courses.length),
      icon: BookOpen,
      color: "var(--primary)",
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
        icon={AlertTriangle}
        title="Dashboard Error"
        description={error}
      />
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-10">
      <PageHeader
        title="Staff Dashboard"
        description="Manage submissions, assignments, and student progress."
      />

      <motion.div
        variants={staggerContainer}
        initial="hidden"
        animate="visible"
        className="grid grid-cols-2 lg:grid-cols-4 gap-4"
      >
        {stats.map((stat) => (
          <motion.div key={stat.label} variants={fadeInUp}>
            {stat.href ? (
              <Link
                href={stat.href}
                className="block p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden group transition-all hover:border-[var(--primary)]/30 hover:shadow-lg"
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
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
                <div className="mt-4 text-xs text-[var(--muted-foreground)] flex items-center gap-2">
                  <span>Open queue</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </div>
              </Link>
            ) : (
              <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl shadow-sm relative overflow-hidden group">
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
                <p className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wider mt-1">
                  {stat.label}
                </p>
              </div>
            )}
          </motion.div>
        ))}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="space-y-4"
      >
        <div className="flex items-center justify-between">
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
            Upcoming Deadlines
          </h2>
          <Link
            href="/staff/calendar"
            className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
          >
            Open calendar
          </Link>
        </div>
        {upcomingDeadlines.length === 0 ? (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] p-6 text-sm text-[var(--muted-foreground)]">
            No upcoming deadlines in your staff courses.
          </div>
        ) : (
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--card)] divide-y divide-[var(--border)]">
            {upcomingDeadlines.map((event) => (
              <UpcomingDeadlineRow
                key={`${event.course_id}-${event.assignment_id}`}
                event={event}
              />
            ))}
          </div>
        )}
      </motion.div>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25 }}
        className="space-y-6"
      >
        <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
          My Courses
        </h2>

        {courses.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="No courses assigned"
            description="You don't have any staff roles in active courses yet."
          />
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

interface UpcomingDeadlineRowProps {
  event: StaffCalendarEvent;
}

function UpcomingDeadlineRow({ event }: UpcomingDeadlineRowProps) {
  const dueDate = new Date(event.due_date);
  return (
    <Link
      href={`/staff/courses/${event.course_id}/assignments/${event.assignment_id}`}
      className="group flex items-center justify-between gap-4 p-4 hover:bg-[var(--background)] transition-colors"
    >
      <div className="min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">
            {event.course_code}
          </span>
          <span className="text-xs text-[var(--muted-foreground)] truncate">
            {event.course_title}
          </span>
        </div>
        <p className="font-medium text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
          {event.assignment_title}
        </p>
      </div>
      <span className="inline-flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] shrink-0">
        <Clock3 className="w-3.5 h-3.5" />
        {dueDate.toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          hour: "numeric",
          minute: "2-digit",
        })}
      </span>
    </Link>
  );
}

interface CourseCardProps {
  course: Course;
  user: ApiUser | null;
}

function CourseCard({ course, user }: CourseCardProps) {
  const role = getCourseRole(user, course.id);

  const roleLabels: Record<string, string> = {
    owner: "Owner",
    co_lecturer: "Co-Lecturer",
    ta: "Teaching Assistant",
    student: "Student",
  };

  return (
    <Link
      href={`/staff/courses/${course.id}`}
      className="group p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/30 hover:shadow-lg transition-all flex flex-col h-full"
    >
      <div className="flex items-start justify-between mb-4">
        <div className="w-10 h-10 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center group-hover:bg-[var(--primary)] group-hover:text-white transition-colors">
          <BookOpen className="w-5 h-5" />
        </div>
        <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-1 rounded-md bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)]">
          {role ? roleLabels[role] || role : "Staff"}
        </span>
      </div>
      <div className="flex-1">
        <div className="mb-2">
          <span className="text-[10px] font-mono bg-[var(--background)] border border-[var(--border)] text-[var(--muted-foreground)] px-1.5 py-0.5 rounded uppercase tracking-tighter">
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
      </div>
      <div className="flex items-center justify-between mt-6 pt-4 border-t border-[var(--border)]/50">
        {course.semester && course.year ? (
          <div className="flex items-center gap-1.5 text-xs text-[var(--muted-foreground)] font-medium">
            <Calendar className="w-3.5 h-3.5" />
            <span>
              {course.semester} {course.year}
            </span>
          </div>
        ) : <div />}
        <ArrowRight className="w-4 h-4 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
      </div>
    </Link>
  );
}
