"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  BookOpen,
  Calendar,
  Clock,
  FileText,
  AlertCircle,
  Loader2,
  ChevronRight,
  FolderOpen,
  Link as LinkIcon,
  Download,
  ExternalLink,
  File,
} from "lucide-react";
import {
  student,
  type Course,
  type Module,
  type Assignment,
  type ModuleResource,
  ApiError,
} from "@/lib/api";
import { reportError } from "@/lib/reportError";

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

// Capture "now" once at module load to keep render output pure/deterministic.
const NOW_MS = Date.now();

interface ModuleWithAssignments extends Module {
  assignments: Assignment[];
}

export default function CourseDetailPage() {
  const params = useParams();
  const router = useRouter();
  const courseId = Number(params.id);

  const [course, setCourse] = useState<Course | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [assignments, setAssignments] = useState<Assignment[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    async function fetchCourseData() {
      if (!courseId || isNaN(courseId)) {
        setError("Invalid course ID");
        setIsLoading(false);
        return;
      }

      try {
        // Fetch course, modules, and assignments in parallel
        const [courseData, modulesData, assignmentsData] = await Promise.all([
          student.getCourse(courseId),
          student.getModules(courseId),
          student.getAssignments(courseId),
        ]);

        setCourse(courseData);
        setModules(modulesData);
        setAssignments(assignmentsData);
      } catch (err) {
        if (err instanceof ApiError) {
          if (err.status === 404) {
            setError("Course not found");
          } else if (err.status === 403) {
            setError("You don't have access to this course");
          } else {
            setError(err.detail);
          }
        } else {
          setError("Failed to load course data");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchCourseData();
  }, [courseId]);

  // Group assignments by module
  const modulesWithAssignments: ModuleWithAssignments[] = modules
    .sort((a, b) => a.position - b.position)
    .map((module) => ({
      ...module,
      assignments: assignments.filter((a) => a.module_id === module.id),
    }));

  // Assignments not in any module (shouldn't happen, but just in case)
  const unassignedAssignments = assignments.filter(
    (a) => !modules.some((m) => m.id === a.module_id)
  );

  // Loading state
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 gap-4">
        <Loader2 className="w-10 h-10 text-[var(--primary)] animate-spin" />
        <span className="font-[family-name:var(--font-mono)] text-[10px] uppercase tracking-widest text-[var(--muted-foreground)]">Loading_Course_Data...</span>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] mb-6 transition-colors font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Return_To_Index</span>
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-8 bg-[var(--secondary)]/5 border-l-4 border-[var(--secondary)] rounded-sm"
        >
          <div className="font-[family-name:var(--font-mono)] text-xs font-bold text-[var(--secondary)] uppercase mb-2">Access_Error</div>
          <p className="text-[var(--secondary)] opacity-80 mb-4">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block px-4 py-2 bg-[var(--secondary)]/10 text-[var(--secondary)] font-bold uppercase text-xs rounded-sm hover:bg-[var(--secondary)]/20 transition-colors"
          >
            Reset_Console
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-5xl mx-auto">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--primary)] mb-8 transition-colors font-[family-name:var(--font-mono)] text-xs uppercase tracking-wider group"
        >
          <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
          <span>Return_To_Index</span>
        </Link>
      </motion.div>

      {/* Course Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-12 border-b border-[var(--border)] pb-8"
      >
        <div className="flex items-start gap-6 mb-6">
          <div className="w-16 h-16 border border-[var(--border)] bg-white flex items-center justify-center rounded-sm shrink-0 shadow-sm">
            <BookOpen className="w-8 h-8 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <div className="flex items-center gap-3 mb-2">
              <span className="inline-block px-2 py-0.5 text-[10px] font-bold font-[family-name:var(--font-mono)] bg-[var(--primary)]/10 text-[var(--primary)] rounded-sm uppercase tracking-[0.2em] border border-[var(--primary)]/20">
                {course.code}
              </span>
              <span className="h-px flex-1 bg-[var(--border)] max-w-[100px]" />
            </div>
            <h1 className="font-[family-name:var(--font-display)] text-4xl md:text-5xl font-bold text-[var(--foreground)] leading-tight">
              {course.title}
            </h1>
          </div>
        </div>

        {course.description && (
          <p className="text-[var(--muted-foreground)] mb-6 text-lg font-light italic pl-2 border-l-2 border-[var(--primary)]/20 max-w-3xl">
            {course.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-6 text-xs text-[var(--muted-foreground)] font-[family-name:var(--font-mono)] uppercase tracking-wider">
          {course.semester && course.year && (
            <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-sm">
              <Calendar className="w-3.5 h-3.5 text-[var(--primary)]" />
              <span>
                {course.semester} // {course.year}
              </span>
            </div>
          )}
          <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-sm">
            <FolderOpen className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Modules: {modules.length.toString().padStart(2, '0')}</span>
          </div>
          <div className="flex items-center gap-2 bg-[var(--background)] border border-[var(--border)] px-3 py-1.5 rounded-sm">
            <FileText className="w-3.5 h-3.5 text-[var(--primary)]" />
            <span>Assignments: {assignments.length.toString().padStart(2, '0')}</span>
          </div>
        </div>
      </motion.div>

      {/* Empty state */}
      {modules.length === 0 && assignments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-20 bg-white border border-[var(--border)] rounded-sm border-dashed"
        >
          <FolderOpen className="w-12 h-12 text-[var(--muted-foreground)]/40 mx-auto mb-4" />
          <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] mb-2">
            File Empty
          </h2>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto font-light text-sm italic">
            Instructor has not yet deposited course materials into the archive.
          </p>
        </motion.div>
      )}

      {/* Assignments-only (no modules yet) */}
      {modules.length === 0 && assignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white border border-[var(--border)] rounded-sm overflow-hidden"
        >
          <div className="p-4 bg-[var(--background)]/50 border-b border-[var(--border)] flex justify-between items-center">
            <h2 className="font-[family-name:var(--font-mono)] font-bold text-[var(--foreground)] uppercase tracking-widest text-xs">
              Direct Assignment Listings
            </h2>
            <div className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase">
              Uncategorized_Items
            </div>
          </div>
          <div className="divide-y divide-[var(--border)]">
            {assignments.map((assignment) => (
              <AssignmentRow key={assignment.id} assignment={assignment} courseId={courseId} />
            ))}
          </div>
        </motion.div>
      )}

      {/* Modules List */}
      {modules.length > 0 && (
        <motion.div
          variants={staggerContainer}
          initial="hidden"
          animate="visible"
          className="space-y-8"
        >
          {modulesWithAssignments.map((module) => (
            <ModuleCard key={module.id} module={module} courseId={courseId} />
          ))}

          {/* Unassigned assignments (fallback) */}
          {unassignedAssignments.length > 0 && (
            <motion.div variants={fadeInUp}>
              <div className="bg-white border border-[var(--border)] rounded-sm overflow-hidden">
                <div className="p-4 bg-[var(--background)]/50 border-b border-[var(--border)]">
                  <h2 className="font-[family-name:var(--font-mono)] font-bold text-[var(--foreground)] uppercase tracking-widest text-xs">
                    Supplemental Assignments
                  </h2>
                </div>
                <div className="divide-y divide-[var(--border)]">
                  {unassignedAssignments.map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      courseId={courseId}
                    />
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
}

interface ModuleCardProps {
  module: ModuleWithAssignments;
  courseId: number;
}

function ModuleCard({ module, courseId }: ModuleCardProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [resources, setResources] = useState<ModuleResource[]>([]);
  const [isLoadingResources, setIsLoadingResources] = useState(false);
  const [resourcesLoaded, setResourcesLoaded] = useState(false);

  const fetchResources = useCallback(async () => {
    setIsLoadingResources(true);
    try {
      const data = await student.getModuleResources(courseId, module.id);
      setResources(data.sort((a, b) => a.position - b.position));
      setResourcesLoaded(true);
    } catch (err) {
      // Silently fail - resources are optional
      reportError("Failed to load resources", err);
      setResourcesLoaded(true);
    } finally {
      setIsLoadingResources(false);
    }
  }, [courseId, module.id]);

  // Fetch resources when expanded for the first time
  useEffect(() => {
    if (isExpanded && !resourcesLoaded) {
      void fetchResources();
    }
  }, [fetchResources, isExpanded, resourcesLoaded]);

  async function handleDownload(resource: ModuleResource) {
    try {
      const blob = await student.downloadResource(resource.id);
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = resource.file_name || "download";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      reportError("Failed to download resource", err);
    }
  }

  function formatFileSize(bytes: number | null) {
    if (!bytes) return "";
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }

  function getFileIcon(contentType: string | null) {
    if (!contentType) return <File className="w-4 h-4" />;
    if (contentType.includes("pdf")) return <FileText className="w-4 h-4" />;
    if (contentType.includes("image")) return <File className="w-4 h-4" />;
    return <File className="w-4 h-4" />;
  }

  const hasContent = module.assignments.length > 0 || resources.length > 0;

  return (
    <motion.div variants={fadeInUp}>
      <div className="bg-white border border-[var(--border)] rounded-sm overflow-hidden shadow-sm hover:shadow-md transition-all duration-300">
        {/* Module Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-5 flex items-start gap-5 bg-[var(--background)]/30 border-b border-[var(--border)] hover:bg-[var(--background)] transition-colors text-left group"
        >
          <div className="w-10 h-10 border border-[var(--border)] bg-white flex items-center justify-center shrink-0 rounded-sm group-hover:border-[var(--primary)] transition-colors">
            <span className="font-[family-name:var(--font-mono)] text-sm font-bold text-[var(--primary)]">
              {module.position.toString().padStart(2, '0')}
            </span>
          </div>
          <div className="flex-1 min-w-0 pt-1">
            <h2 className="font-[family-name:var(--font-display)] text-xl font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
              {module.title}
            </h2>
            {module.description && (
              <p className="text-sm text-[var(--muted-foreground)] truncate mt-1 font-light italic">
                {module.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-3 pt-2">
            <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-[var(--muted-foreground)] bg-white border border-[var(--border)] px-2 py-1 rounded-sm">
              {module.assignments.length} Item{module.assignments.length !== 1 ? "s" : ""}
            </span>
            <ChevronRight
              className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform duration-300 ${
                isExpanded ? "rotate-90" : ""
              }`}
            />
          </div>
        </button>

        {/* Content (Resources + Assignments) */}
        {isExpanded && (
          <div>
            {/* Resources Section */}
            {isLoadingResources && (
              <div className="p-4 flex items-center justify-center border-b border-[var(--border)]">
                <Loader2 className="w-4 h-4 text-[var(--primary)] animate-spin" />
              </div>
            )}

            {!isLoadingResources && resources.length > 0 && (
              <div className="p-5 bg-[var(--primary)]/[0.02] border-b border-[var(--border)]">
                <h3 className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase tracking-widest mb-4">
                  Supplemental_Resources
                </h3>
                <div className="grid gap-3">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center gap-4 p-3 bg-white border border-[var(--border)] rounded-sm hover:border-[var(--primary)]/50 transition-colors group"
                    >
                      <div className="w-8 h-8 rounded-sm bg-[var(--background)] border border-[var(--border)] flex items-center justify-center flex-shrink-0 group-hover:bg-[var(--primary)]/5 transition-colors">
                        {resource.kind === "link" ? (
                          <LinkIcon className="w-3.5 h-3.5 text-[var(--primary)]" />
                        ) : (
                          <span className="text-[var(--primary)]">
                            {getFileIcon(resource.content_type)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate group-hover:text-[var(--primary)] transition-colors">
                          {resource.title}
                        </p>
                        {resource.kind === "file" && resource.size_bytes != null && (
                          <p className="text-[10px] font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase mt-0.5">
                            SIZE: {formatFileSize(resource.size_bytes)}
                          </p>
                        )}
                      </div>
                      {resource.kind === "link" ? (
                        <a
                          href={resource.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-sm border border-[var(--primary)]/10 transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3 h-3" />
                          Access
                        </a>
                      ) : (
                        <button
                          onClick={() => handleDownload(resource)}
                          className="flex items-center gap-2 px-3 py-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider text-[var(--primary)] bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 rounded-sm border border-[var(--primary)]/10 transition-colors"
                        >
                          <Download className="w-3 h-3" />
                          Download
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments List */}
            <div className="divide-y divide-[var(--border)] border-t border-[var(--border)] -mt-px">
              {!isLoadingResources && !hasContent && (
                <div className="p-8 text-center text-[var(--muted-foreground)] text-sm italic font-light">
                  [ No content logged for this module ]
                </div>
              )}
              {module.assignments.length === 0 && resources.length > 0 && (
                <div className="p-4 text-center text-[var(--muted-foreground)] text-xs font-[family-name:var(--font-mono)] uppercase tracking-wider">
                  No_Assignments_Pending
                </div>
              )}
              {module.assignments.length > 0 && (
                <>
                  {resources.length > 0 && (
                    <div className="px-5 pt-5 pb-2">
                       <h3 className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase tracking-widest">
                        Required_Deliverables
                      </h3>
                    </div>
                  )}
                  {module.assignments.map((assignment) => (
                    <AssignmentRow
                      key={assignment.id}
                      assignment={assignment}
                      courseId={courseId}
                    />
                  ))}
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </motion.div>
  );
}

interface AssignmentRowProps {
  assignment: Assignment;
  courseId: number;
}

function AssignmentRow({ assignment, courseId }: AssignmentRowProps) {
  const dueDate = assignment.due_date ? new Date(assignment.due_date) : null;
  const nowMs = NOW_MS;

  const isPastDue = dueDate ? dueDate.getTime() < nowMs : false;
  const isUpcoming = dueDate
    ? dueDate.getTime() > nowMs && dueDate.getTime() - nowMs < 7 * 24 * 60 * 60 * 1000
    : false; // within 7 days

  return (
    <Link
      href={`/dashboard/courses/${courseId}/assignments/${assignment.id}`}
      className="group flex items-center gap-5 p-5 hover:bg-[var(--background)]/30 transition-colors relative"
    >
       <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-transparent group-hover:bg-[var(--primary)] transition-all" />
      
      <div
        className={`w-10 h-10 border border-[var(--border)] rounded-sm flex items-center justify-center shrink-0 transition-colors ${
          isPastDue
            ? "bg-[var(--secondary)]/10 border-[var(--secondary)]/30"
            : isUpcoming
            ? "bg-amber-500/10 border-amber-500/30"
            : "bg-white group-hover:border-[var(--primary)]"
        }`}
      >
        <FileText
          className={`w-5 h-5 ${
            isPastDue
              ? "text-[var(--secondary)]"
              : isUpcoming
              ? "text-amber-600"
              : "text-[var(--primary)]"
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-bold text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors text-lg font-[family-name:var(--font-display)]">
          {assignment.title}
        </h3>
        <div className="flex items-center gap-4 mt-1">
          {dueDate && (
            <span
              className={`flex items-center gap-1.5 text-[10px] font-bold font-[family-name:var(--font-mono)] uppercase tracking-wider ${
                isPastDue
                  ? "text-[var(--secondary)]"
                  : isUpcoming
                  ? "text-amber-600"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <Clock className="w-3 h-3" />
              {isPastDue ? "STATUS: PAST_DUE // " : "DUE_DATE: "}
              {dueDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          <span className="text-[10px] font-bold font-[family-name:var(--font-mono)] text-[var(--muted-foreground)] uppercase tracking-wider">
            VAL: {assignment.max_points}PTS
          </span>
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all opacity-50 group-hover:opacity-100" />
    </Link>
  );
}
