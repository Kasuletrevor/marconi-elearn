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
import { student, type Course, type Assignment, ApiError } from "@/lib/api";

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

interface AssignmentWithCourse extends Assignment {
  course: Course;
}

export default function DashboardPage() {
  const [courses, setCourses] = useState<Course[]>([]);
  const [upcomingAssignments, setUpcomingAssignments] = useState<
    AssignmentWithCourse[]
  >([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingAssignments, setIsLoadingAssignments] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch courses first
        const coursesData = await student.getCourses();
        setCourses(coursesData);
        setIsLoading(false);

        // Then fetch assignments for each course in parallel
        if (coursesData.length > 0) {
          const assignmentsPromises = coursesData.map(async (course) => {
            try {
              const assignments = await student.getAssignments(course.id);
              return assignments.map((a) => ({ ...a, course }));
            } catch {
              return [];
            }
          });

          const allAssignments = await Promise.all(assignmentsPromises);
          const flatAssignments = allAssignments.flat();

          // Filter for upcoming (due date in future) and sort by due date
          const now = new Date();
          const upcoming = flatAssignments
            .filter((a) => a.due_date && new Date(a.due_date) > now)
            .sort(
              (a, b) =>
                new Date(a.due_date!).getTime() -
                new Date(b.due_date!).getTime()
            )
            .slice(0, 5); // Show max 5 upcoming

          setUpcomingAssignments(upcoming);
        }
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
        className="mb-12 flex flex-col md:flex-row md:items-end justify-between gap-6"
      >
        <div>
          <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--primary)] uppercase tracking-[0.3em] mb-3">
            Institutional_Console // Student_View
          </div>
          <h1 className="font-[family-name:var(--font-display)] text-5xl font-bold text-[var(--foreground)] mb-2">
            Academic Dashboard
          </h1>
          <p className="text-[var(--muted-foreground)] font-light italic">
            Authorized session for [Student Archive]. Unified course management interface.
          </p>
        </div>
        <Link
          href="/dashboard/join"
          className="inline-flex items-center gap-3 px-6 py-3 bg-[var(--primary)] text-white hover:bg-[var(--primary-hover)] transition-all rounded-sm font-bold uppercase tracking-widest text-xs border border-[var(--primary)] shadow-lg shadow-[var(--primary)]/10"
        >
          <Users className="w-4 h-4" />
          Enroll_New_Course
        </Link>
      </motion.div>

      {/* Loading State */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
          <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Retrieving_Records...</span>
        </div>
      )}

      {/* Error State */}
      {error && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="p-8 bg-[var(--secondary)]/5 border-l-4 border-[var(--secondary)] rounded-sm"
        >
          <div className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--secondary)] uppercase mb-2">System_Error</div>
          <p className="text-[var(--secondary)] opacity-80">{error}</p>
        </motion.div>
      )}

      {/* Empty State */}
      {!isLoading && !error && courses.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-24 border border-[var(--border)] border-dashed bg-white/50"
        >
          <div className="w-20 h-20 mx-auto mb-8 border border-[var(--border)] bg-white flex items-center justify-center rounded-sm rotate-6 transition-transform hover:rotate-0">
            <FolderOpen className="w-10 h-10 text-[var(--muted-foreground)]" />
          </div>
          <h2 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] mb-3">
            Null Records Found
          </h2>
          <p className="text-[var(--muted-foreground)] max-w-sm mx-auto text-sm italic font-light">
            No active course enrollments detected for this session. Please verify invite links or contact the department.
          </p>
        </motion.div>
      )}

      {/* Dashboard Content */}
      {!isLoading && !error && courses.length > 0 && (
        <div className="space-y-16">
          {/* Upcoming Assignments Section */}
          <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
          >
            <div className="flex items-end justify-between mb-8 border-b border-[var(--border)] pb-4">
              <div>
                 <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--secondary)] uppercase tracking-widest mb-1 font-bold">
                  Attention_Required
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
                  Assignment Ledger
                </h2>
              </div>
              {upcomingAssignments.length > 0 && (
                <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-tighter">
                  Showing_{upcomingAssignments.length}_Pending_Items
                </div>
              )}
            </div>

            {isLoadingAssignments ? (
              <div className="p-12 bg-white/50 border border-[var(--border)] rounded-sm flex flex-col items-center justify-center gap-4">
                <Loader2 className="w-6 h-6 text-[var(--primary)] animate-spin" />
                <span className="font-[family-name:var(--font-mono)] text-[8px] uppercase tracking-widest text-[var(--muted-foreground)]">Compiling_Assignments...</span>
              </div>
            ) : upcomingAssignments.length === 0 ? (
              <div className="p-10 bg-white/50 border border-[var(--border)] rounded-sm text-center border-dashed">
                <Clock className="w-8 h-8 text-[var(--muted-foreground)] mx-auto mb-4 opacity-40" />
                <p className="text-[var(--muted-foreground)] font-light italic">
                  All academic deliverables completed. No pending items in ledger.
                </p>
              </div>
            ) : (
              <div className="bg-white border border-[var(--border)] rounded-sm overflow-hidden shadow-sm">
                {upcomingAssignments.map((assignment) => (
                  <UpcomingAssignmentRow
                    key={`${assignment.course.id}-${assignment.id}`}
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
            <div className="flex items-end justify-between mb-10 border-b border-[var(--border)] pb-4">
              <div>
                <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--primary)] uppercase tracking-widest mb-1 font-bold">
                  Enrolled_Curriculum
                </div>
                <h2 className="font-[family-name:var(--font-display)] text-3xl font-bold text-[var(--foreground)]">
                  Course Catalog
                </h2>
              </div>
              <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-tighter">
                TOTAL_RECORDS: {courses.length}
              </div>
            </div>

            <motion.div
              variants={staggerContainer}
              initial="hidden"
              animate="visible"
              className="grid md:grid-cols-2 lg:grid-cols-3 gap-8"
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
  assignment: AssignmentWithCourse;
}

function UpcomingAssignmentRow({ assignment }: UpcomingAssignmentRowProps) {
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
  const now = new Date();
  const daysUntilDue = dueDate
    ? Math.ceil((dueDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    : null;

  const isUrgent = daysUntilDue !== null && daysUntilDue <= 2;
  const isSoon = daysUntilDue !== null && daysUntilDue <= 7;

  return (
    <Link
      href={`/dashboard/courses/${assignment.course.id}/assignments/${assignment.id}`}
      className="group flex items-center gap-6 p-5 hover:bg-white transition-all border-b border-[var(--border)] last:border-0 relative overflow-hidden"
    >
      {/* Ledger marker */}
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-transparent group-hover:bg-[var(--primary)] transition-all" />

      <div className="flex flex-col items-center justify-center shrink-0 w-16 h-16 border border-[var(--border)] bg-[var(--background)] group-hover:bg-white transition-colors relative">
        <div className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-tighter mb-1">DUE</div>
        <div className={`font-bold text-lg leading-none ${isUrgent ? "text-[var(--secondary)]" : "text-[var(--foreground)]"}`}>
          {dueDate ? dueDate.getDate() : "??"}
        </div>
        <div className="font-[family-name:var(--font-mono)] text-[8px] text-[var(--muted-foreground)] uppercase">
          {dueDate ? dueDate.toLocaleDateString('en-US', { month: 'short' }) : "---"}
        </div>
      </div>

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-3 mb-2">
          <span className="font-[family-name:var(--font-mono)] text-[10px] font-bold text-[var(--primary)] border border-[var(--primary)]/20 px-1.5 py-0.5 rounded-sm uppercase tracking-wider bg-[var(--primary)]/5">
            {assignment.course.code}
          </span>
          {isUrgent && (
             <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-sm">
                <AlertCircle className="w-3 h-3 text-[var(--secondary)]" />
                <span className="font-[family-name:var(--font-mono)] text-[9px] font-bold text-[var(--secondary)] uppercase tracking-widest animate-pulse">
                  PRIORITY_RED
                </span>
             </div>
          )}
        </div>
        <h3 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors truncate">
          {assignment.title}
        </h3>
        <div className="flex items-center gap-4 mt-2">
          {dueDate && (
            <span
              className={`font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-wider flex items-center gap-1.5 ${
                isUrgent
                  ? "text-[var(--secondary)]"
                  : isSoon
                  ? "text-amber-600"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <Clock className="w-3 h-3" />
              {dueDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
              {daysUntilDue !== null && daysUntilDue <= 7 && (
                <span className="ml-1 opacity-60">
                  // {daysUntilDue === 0 ? "ST_NOW" : daysUntilDue === 1 ? "ST_TOMORROW" : `ST_IN_${daysUntilDue}_DAYS`}
                </span>
              )}
            </span>
          )}
          <span className="font-[family-name:var(--font-mono)] text-[10px] text-[var(--muted-foreground)] uppercase tracking-wider">
            MAX_VAL: {assignment.max_points}PTS
          </span>
        </div>
      </div>

      <div className="flex flex-col items-end gap-2">
         <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
      </div>
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
        className="group relative block p-8 bg-white border border-[var(--border)] rounded-sm hover:border-[var(--primary)] hover:shadow-2xl hover:shadow-[var(--primary)]/10 transition-all duration-500 overflow-hidden"
      >
        {/* Archival Metadata Labels */}
        <div className="absolute top-0 right-0 p-3 font-[family-name:var(--font-mono)] text-[8px] text-[var(--primary)]/20 uppercase tracking-tighter select-none transition-colors group-hover:text-[var(--primary)]/60">
          INDEX_REF: {course.code.replace(/\s+/g, '_')}
        </div>
        <div className="absolute bottom-0 left-0 p-3 font-[family-name:var(--font-mono)] text-[8px] text-[var(--primary)]/20 uppercase tracking-tighter select-none">
          SECURE_FILE // M-26
        </div>

        {/* Header Decoration */}
        <div className="flex items-start justify-between mb-8">
          <div className="w-12 h-12 border border-[var(--border)] bg-[var(--background)] flex items-center justify-center rounded-sm transition-transform group-hover:rotate-6">
            <BookOpen className="w-6 h-6 text-[var(--primary)]" />
          </div>
          <div className="flex flex-col items-end">
            <div className="h-px w-8 bg-[var(--border)] mb-1" />
            <div className="h-px w-4 bg-[var(--border)]" />
          </div>
        </div>

        {/* Course Info */}
        <div className="mb-8">
          <span className="inline-block px-2 py-0.5 text-[10px] font-bold font-[family-name:var(--font-mono)] border border-[var(--primary)]/20 text-[var(--primary)] rounded-sm mb-4 uppercase tracking-[0.2em] bg-[var(--primary)]/5">
            {course.code}
          </span>
          <h3 className="font-[family-name:var(--font-display)] text-2xl font-bold text-[var(--foreground)] leading-tight group-hover:text-[var(--primary)] transition-colors">
            {course.title}
          </h3>
          {course.description && (
            <p className="text-sm text-[var(--muted-foreground)] mt-4 line-clamp-2 italic font-light leading-relaxed">
              {course.description}
            </p>
          )}
        </div>

        {/* Meta Footer */}
        <div className="flex items-center justify-between pt-6 border-t border-[var(--border)] border-dashed">
          {course.semester && course.year && (
            <div className="flex items-center gap-2 text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase tracking-widest">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)]/60" />
              <span>
                {course.semester} // {course.year}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--primary)] uppercase">
            <span>VIEW_FILE</span>
            <ChevronRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
          </div>
        </div>

        {/* Stamp Effect (Visual) */}
        <div className="absolute -bottom-10 -right-10 w-32 h-32 opacity-[0.02] rotate-12 transition-opacity group-hover:opacity-[0.05]">
          <div className="border-4 border-[var(--primary)] p-2 rounded-full text-center">
            <div className="font-bold text-xl uppercase">ACTIVE</div>
          </div>
        </div>
      </Link>
    </motion.div>
  );
}
