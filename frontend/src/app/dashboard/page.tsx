"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  BookOpen,
  Calendar,
  ChevronRight,
  Loader2,
  FolderOpen,
  Clock,
  FileText,
  AlertCircle,
  Users,
} from "lucide-react";
import { student, type Course, type StudentCalendarEvent, ApiError } from "@/lib/api";

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

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<StudentCalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        const nowIso = new Date().toISOString();
        const [coursesData, eventsData] = await Promise.all([
          student.getCourses(),
          student.getCalendarEvents({ starts_at: nowIso, limit: 1000 }),
        ]);
        setCourses(coursesData);
        setIsLoading(false);

        const upcoming = eventsData
          .sort(
            (a, b) =>
              new Date(a.effective_due_date).getTime() -
              new Date(b.effective_due_date).getTime()
          )
          .slice(0, 5);
        setUpcomingAssignments(upcoming);
      } catch (err) {
        if (err instanceof ApiError) {
          setError(err.detail);
        } else {
          setError("Failed to load courses");
        }
        setIsLoading(false);
      } finally {
        setIsLoadingAssignments(false);
      }
    }

    fetchData();
  }, []);

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8 flex items-start justify-between gap-4"
      >
        <div>
          <h1 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)] mb-2">
            Dashboard
          </h1>
          <p className="text-[var(--muted-foreground)]">
            Welcome back! Here&apos;s what&apos;s happening with your courses.
          </p>
        </div>
        <Link
          href="/dashboard/join"
          className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-colors text-sm"
        >
          <Users className="w-4 h-4" />
          Join course
        </Link>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center"
        >
          <p className="text-[var(--secondary)]">{error}</p>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20"
        >
          <div className="w-16 h-16 mx-auto mb-6 rounded-2xl bg-[var(--card)] border border-[var(--border)] flex items-center justify-center">
            <FolderOpen className="w-8 h-8 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)] mb-2">
            No courses yet
          </h2>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
            You haven&apos;t been enrolled in any courses yet. Check your email
            for an invite link from your lecturer.
          </p>
        </motion.div>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && courses.length > 0 && (
        <div className="space-y-8">
          {/* Upcoming Assignments Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
                Upcoming Assignments
              </h2>
              <Link
                href="/dashboard/calendar"
                className="text-sm text-[var(--primary)] hover:text-[var(--primary-hover)] transition-colors"
              >
                Open calendar
              </Link>
            </div>

            {isLoadingAssignments ? (
              <div className="p-8 bg-[var(--card)] border border-[var(--border)] rounded-2xl flex items-center justify-center">
                <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
              </div>
            ) : upcomingAssignments.length === 0 ? (
              <div className="p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl text-center">
                <Clock className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-3" />
                <p className="text-[var(--muted-foreground)]">
                  No upcoming assignments. You&apos;re all caught up!
                </p>
              </div>
            ) : (
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden divide-y divide-[var(--border)]">
                {upcomingAssignments.map((assignment) => (
                  <UpcomingAssignmentRow
                    key={`${assignment.course_id}-${assignment.assignment_id}`}
                    assignment={assignment}
                  />
                ))}
              </div>
            )}
          </motion.section>

          {/* My Courses Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-[family-name:var(--font-display)] text-xl font-semibold text-[var(--foreground)]">
                My Courses
              </h2>
              <span className="text-sm text-[var(--muted-foreground)]">
                {courses.length} enrolled
              </span>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-6"
            >
              {courses.map((course) => (
                <CourseCard key={course.id} course={course} />
              ))}
            </motion.div>
          </motion.section>
        </div>
      )}
    </div>
  );
}

interface UpcomingAssignmentRowProps {
  assignment: StudentCalendarEvent;
}

function UpcomingAssignmentRow({ assignment }: UpcomingAssignmentRowProps) {
  const dueDate = assignment.effective_due_date
    ? new Date(assignment.effective_due_date)
    : null;
  const now = new Date();
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isUrgent = daysUntilDue !== null && daysUntilDue <= 2;
  const isSoon = daysUntilDue !== null && daysUntilDue <= 7;

  return (
    <Link
      href={`/dashboard/courses/${assignment.course_id}/assignments/${assignment.assignment_id}`}
      className="group flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isUrgent
            ? "bg-[var(--secondary)]/10"
            : isSoon
            ? "bg-[var(--warning)]/10"
            : "bg-[var(--primary)]/10"
        }`}
      >
        <FileText
          className={`w-5 h-5 ${
            isUrgent
              ? "text-[var(--secondary)]"
              : isSoon
              ? "text-[var(--warning)]"
              : "text-[var(--primary)]"
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          <span className="text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 px-1.5 py-0.5 rounded">
            {assignment.course_code}
          </span>
          {isUrgent && (
            <span className="text-xs font-medium text-[var(--secondary)] bg-[var(--secondary)]/10 px-1.5 py-0.5 rounded flex items-center gap-1">
              <AlertCircle className="w-3 h-3" />
              Due soon
            </span>
          )}
        </div>
        <h3 className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
          {assignment.assignment_title}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          {dueDate && (
            <span
              className={`flex items-center gap-1 text-xs ${
                isUrgent
                  ? "text-[var(--secondary)]"
                  : isSoon
                  ? "text-[var(--warning)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <Clock className="w-3 h-3" />
              {dueDate.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
              {daysUntilDue !== null && daysUntilDue <= 7 && (
                <span className="ml-1">
                  ({daysUntilDue === 0 ? "Today" : daysUntilDue === 1 ? "Tomorrow" : `${daysUntilDue} days`})
                </span>
              )}
            </span>
          )}
          <span className="text-xs text-[var(--muted-foreground)]">
            {assignment.course_title}
          </span>
          {assignment.has_extension && (
            <span className="text-xs font-medium text-[var(--secondary)] bg-[var(--secondary)]/12 px-1.5 py-0.5 rounded">
              Extension
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all shrink-0" />
    </Link>
  );
}

interface CourseCardProps {
  course: Course;
}

function CourseCard({ course }: CourseCardProps) {
  return (
    <motion.div variants={fadeInUp}>
      <Link
        href={`/dashboard/courses/${course.id}`}
        className="group block p-6 bg-[var(--card)] border border-[var(--border)] rounded-2xl hover:border-[var(--primary)]/30 hover:shadow-lg hover:shadow-[var(--primary)]/5 transition-all duration-300"
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="w-12 h-12 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
        </div>

        {/* Course Info */}
        <div className="mb-4">
          <span className="inline-block px-2 py-1 text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] rounded-md mb-2">
            {course.code}
          </span>
          <h3 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] leading-tight group-hover:text-[var(--primary)] transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-sm text-[var(--muted-foreground)] mt-2 line-clamp-2">
              {course.description}
            </p>
          )}
        </div>

        {/* Meta */}
        <div className="flex items-center gap-4 pt-4 border-t border-[var(--border)]">
          {course.semester && course.year && (
            <div className="flex items-center gap-1.5 text-sm text-[var(--muted-foreground)]">
              <Calendar className="w-4 h-4" />
              <span>
                {course.semester}, {course.year}
              </span>
            </div>
          )}
        </div>
      </Link>
    </motion.div>
  );
}
