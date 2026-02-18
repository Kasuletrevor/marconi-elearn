"use client";

import React, { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
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
  studentCourseGitHub,
  userIntegrations,
  type Course,
  type Module,
  type Assignment,
  type ModuleResource,
  type CourseGitHubClaim,
  ApiError,
} from "@/lib/api";
import { reportError } from "@/lib/reportError";
import { PdfPreviewModal } from "@/components/shared/PdfPreviewModal";

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

interface GitHubStatus {
  connected: boolean;
  github_user_id: number | null;
  github_login: string | null;
  github_connected_at: string | null;
}

interface StudentCourseDetailClientProps {
  courseId: number;
  initialCourse: Course | null;
  initialModules: Module[];
  initialAssignments: Assignment[];
  initialGitHubStatus: GitHubStatus | null;
  initialCourseGitHubClaim: CourseGitHubClaim | null;
  initialError: string;
}

export default function StudentCourseDetailClient({
  courseId,
  initialCourse,
  initialModules,
  initialAssignments,
  initialGitHubStatus,
  initialCourseGitHubClaim,
  initialError,
}: StudentCourseDetailClientProps) {
  const router = useRouter();

  const [course] = useState<Course | null>(initialCourse);
  const [modules] = useState<Module[]>(initialModules);
  const [assignments] = useState<Assignment[]>(initialAssignments);
  const [isLoading] = useState(false);
  const [error] = useState(initialError);
  const [gitHubStatus] = useState<GitHubStatus | null>(initialGitHubStatus);
  const [courseGitHubClaim, setCourseGitHubClaim] = useState<CourseGitHubClaim | null>(
    initialCourseGitHubClaim
  );
  const [isRequestingGitHubClaim, setIsRequestingGitHubClaim] = useState(false);
  const [gitHubClaimError, setGitHubClaimError] = useState("");

  const requestGitHubLink = useCallback(async () => {
    setIsRequestingGitHubClaim(true);
    setGitHubClaimError("");
    try {
      const claim = await studentCourseGitHub.createOrUpdateClaim(courseId);
      setCourseGitHubClaim(claim);
    } catch (err) {
      if (err instanceof ApiError) setGitHubClaimError(err.detail);
      else setGitHubClaimError("Failed to request GitHub linking");
    } finally {
      setIsRequestingGitHubClaim(false);
    }
  }, [courseId]);

  // Group assignments by module
  const modulesWithAssignments: ModuleWithAssignments[] = modules
    .slice()
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
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="max-w-4xl mx-auto">
        <button
          onClick={() => router.back()}
          className="flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to courses</span>
        </button>
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-6 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-2xl text-center"
        >
          <AlertCircle className="w-8 h-8 text-[var(--secondary)] mx-auto mb-3" />
          <p className="text-[var(--secondary)]">{error}</p>
          <Link
            href="/dashboard"
            className="inline-block mt-4 text-[var(--primary)] hover:underline"
          >
            Go to dashboard
          </Link>
        </motion.div>
      </div>
    );
  }

  if (!course) return null;

  return (
    <div className="max-w-4xl mx-auto">
      {/* Back button */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
        <Link
          href="/dashboard"
          className="inline-flex items-center gap-2 text-[var(--muted-foreground)] hover:text-[var(--foreground)] mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to courses</span>
        </Link>
      </motion.div>

      {/* Course Header */}
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-8"
      >
        <div className="flex items-start gap-4 mb-4">
          <div className="w-14 h-14 rounded-xl bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-7 h-7 text-[var(--primary)]" />
          </div>
          <div className="flex-1 min-w-0">
            <span className="inline-block px-2 py-1 text-xs font-medium bg-[var(--primary)]/10 text-[var(--primary)] rounded-md mb-2">
              {course.code}
            </span>
            <h1 className="font-[family-name:var(--font-display)] text-2xl md:text-3xl font-bold text-[var(--foreground)]">
              {course.title}
            </h1>
          </div>
        </div>

        {course.description && (
          <p className="text-[var(--muted-foreground)] mb-4">
            {course.description}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--muted-foreground)]">
          {course.semester && course.year && (
            <div className="flex items-center gap-1.5">
              <Calendar className="w-4 h-4" />
              <span>
                {course.semester}, {course.year}
              </span>
            </div>
          )}
          <div className="flex items-center gap-1.5">
            <FolderOpen className="w-4 h-4" />
            <span>{modules.length} modules</span>
          </div>
          <div className="flex items-center gap-1.5">
            <FileText className="w-4 h-4" />
            <span>{assignments.length} assignments</span>
          </div>
        </div>
      </motion.div>

      {/* GitHub linking (optional) */}
      <motion.div variants={fadeInUp} initial="hidden" animate="visible" className="mb-8">
        <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
          <div className="p-4 bg-[var(--background)] border-b border-[var(--border)] flex items-start justify-between gap-4">
            <div>
              <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
                GitHub (optional)
              </h2>
              <p className="text-xs text-[var(--muted-foreground)] mt-1">
                Link your GitHub account for GitHub-based submissions and Classroom workflows.
              </p>
            </div>
            <div className="shrink-0">
              {!gitHubStatus?.connected ? (
                <a
                  href={userIntegrations.githubConnectUrl()}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-opacity"
                >
                  <LinkIcon className="w-4 h-4" />
                  Connect GitHub
                </a>
              ) : courseGitHubClaim?.status === "approved" ? (
                <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--success)]/10 text-[var(--success)] rounded-xl">
                  Linked: @{courseGitHubClaim.github_login}
                </span>
              ) : courseGitHubClaim?.status === "pending" ? (
                <span className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--warning)]/10 text-[var(--warning)] rounded-xl">
                  Pending approval
                </span>
              ) : (
                <button
                  onClick={() => void requestGitHubLink()}
                  disabled={isRequestingGitHubClaim}
                  className="inline-flex items-center gap-2 px-3 py-2 text-sm font-medium bg-[var(--primary)] text-white rounded-xl hover:opacity-90 transition-opacity disabled:opacity-50"
                >
                  {isRequestingGitHubClaim ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <LinkIcon className="w-4 h-4" />
                  )}
                  Request linking
                </button>
              )}
            </div>
          </div>

          <div className="p-4">
            {!gitHubStatus ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                GitHub status not loaded yet.
              </p>
            ) : !gitHubStatus.connected ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Connect GitHub to claim your account for this course.
              </p>
            ) : courseGitHubClaim?.status === "approved" ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Your GitHub account is linked for this course. If you switch GitHub accounts, reconnect in Settings and request linking again.
              </p>
            ) : courseGitHubClaim?.status === "pending" ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Your request was sent to course staff. You can keep using the platform while you wait.
              </p>
            ) : courseGitHubClaim?.status === "rejected" ? (
              <p className="text-sm text-[var(--muted-foreground)]">
                Your request was rejected. Double-check you connected the correct GitHub account, then request linking again.
              </p>
            ) : (
              <p className="text-sm text-[var(--muted-foreground)]">
                Connected as <span className="font-medium text-[var(--foreground)]">@{gitHubStatus.github_login}</span>. Request linking to attach this account to the course roster.
              </p>
            )}

            {gitHubClaimError && (
              <div className="mt-3 p-3 bg-[var(--secondary)]/10 border border-[var(--secondary)]/20 rounded-xl text-sm text-[var(--secondary)] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 mt-0.5" />
                <span>{gitHubClaimError}</span>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Empty state */}
      {modules.length === 0 && assignments.length === 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center py-16 bg-[var(--card)] border border-[var(--border)] rounded-2xl"
        >
          <FolderOpen className="w-12 h-12 text-[var(--muted-foreground)] mx-auto mb-4" />
          <h2 className="font-[family-name:var(--font-display)] text-lg font-semibold text-[var(--foreground)] mb-2">
            No content yet
          </h2>
          <p className="text-[var(--muted-foreground)] max-w-md mx-auto">
            Your instructor hasn&apos;t added any modules or assignments to this
            course yet. Check back later!
          </p>
        </motion.div>
      )}

      {/* Assignments-only (no modules yet) */}
      {modules.length === 0 && assignments.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden"
        >
          <div className="p-4 bg-[var(--background)] border-b border-[var(--border)]">
            <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
              Assignments
            </h2>
            <p className="text-xs text-[var(--muted-foreground)] mt-1">
              This course hasn&apos;t organized modules yet — assignments are listed here.
            </p>
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
          className="space-y-6"
        >
          {modulesWithAssignments.map((module) => (
            <ModuleCard key={module.id} module={module} courseId={courseId} />
          ))}

          {/* Unassigned assignments (fallback) */}
          {unassignedAssignments.length > 0 && (
            <motion.div variants={fadeInUp}>
              <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
                <div className="p-4 bg-[var(--background)] border-b border-[var(--border)]">
                  <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
                    Other Assignments
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
  const [previewResource, setPreviewResource] = useState<ModuleResource | null>(null);
  const [previewBlob, setPreviewBlob] = useState<Blob | null>(null);
  const [isPreviewLoading, setIsPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState("");

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

  function isPdfResource(resource: ModuleResource) {
    const name = (resource.file_name || "").toLowerCase();
    return resource.kind === "file" && (name.endsWith(".pdf") || resource.content_type?.includes("pdf"));
  }

  function closePreview() {
    setPreviewResource(null);
    setPreviewBlob(null);
    setPreviewError("");
    setIsPreviewLoading(false);
  }

  async function openPdfPreview(resource: ModuleResource) {
    if (!isPdfResource(resource)) return;
    setPreviewResource(resource);
    setPreviewError("");
    setIsPreviewLoading(true);
    try {
      const blob = await student.downloadResource(resource.id);
      const isPdf =
        blob.type.includes("pdf") ||
        (resource.file_name || "").toLowerCase().endsWith(".pdf");
      if (!isPdf) {
        setPreviewBlob(null);
        setPreviewError("Selected file is not a PDF.");
        return;
      }
      setPreviewBlob(blob);
    } catch (err) {
      setPreviewBlob(null);
      if (err instanceof ApiError) setPreviewError(err.detail);
      else setPreviewError("Failed to load PDF preview.");
    } finally {
      setIsPreviewLoading(false);
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
      <div className="bg-[var(--card)] border border-[var(--border)] rounded-2xl overflow-hidden">
        {/* Module Header */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className="w-full p-4 flex items-center gap-3 bg-[var(--background)] border-b border-[var(--border)] hover:bg-[var(--card)] transition-colors text-left"
        >
          <div className="w-8 h-8 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center shrink-0">
            <span className="text-sm font-semibold text-[var(--primary)]">
              {module.position}
            </span>
          </div>
          <div className="flex-1 min-w-0">
            <h2 className="font-[family-name:var(--font-display)] font-semibold text-[var(--foreground)]">
              {module.title}
            </h2>
            {module.description && (
              <p className="text-sm text-[var(--muted-foreground)] truncate">
                {module.description}
              </p>
            )}
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--muted-foreground)] bg-[var(--background)] px-2 py-1 rounded-md">
              {module.assignments.length} assignment
              {module.assignments.length !== 1 ? "s" : ""}
            </span>
            <ChevronRight
              className={`w-5 h-5 text-[var(--muted-foreground)] transition-transform ${
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
              <div className="p-4 flex items-center justify-center">
                <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
              </div>
            )}

            {!isLoadingResources && resources.length > 0 && (
              <div className="p-4 bg-[var(--primary)]/[0.02] border-b border-[var(--border)]">
                <h3 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide mb-3">
                  Resources
                </h3>
                <div className="grid gap-2">
                  {resources.map((resource) => (
                    <div
                      key={resource.id}
                      className="flex items-center gap-3 p-3 bg-[var(--card)] border border-[var(--border)] rounded-xl hover:border-[var(--primary)]/30 transition-colors"
                    >
                      <div className="w-9 h-9 rounded-lg bg-[var(--primary)]/10 flex items-center justify-center flex-shrink-0">
                        {resource.kind === "link" ? (
                          <LinkIcon className="w-4 h-4 text-[var(--primary)]" />
                        ) : (
                          <span className="text-[var(--primary)]">
                            {getFileIcon(resource.content_type)}
                          </span>
                        )}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[var(--foreground)] truncate">
                          {resource.title}
                        </p>
                        {resource.kind === "file" && resource.size_bytes != null && (
                          <p className="text-xs text-[var(--muted-foreground)]">
                            {formatFileSize(resource.size_bytes)}
                          </p>
                        )}
                      </div>
                      {resource.kind === "link" ? (
                        <a
                          href={resource.url || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          Open
                        </a>
                      ) : (
                        <div className="flex items-center gap-2">
                          {isPdfResource(resource) ? (
                            <button
                              onClick={() => void openPdfPreview(resource)}
                              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--foreground)] bg-[var(--card)] border border-[var(--border)] hover:bg-[var(--background)] rounded-lg transition-colors"
                            >
                              <FileText className="w-3.5 h-3.5" />
                              Preview
                            </button>
                          ) : null}
                          <button
                            onClick={() => handleDownload(resource)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[var(--primary)] bg-[var(--primary)]/10 hover:bg-[var(--primary)]/20 rounded-lg transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Download
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Assignments List */}
            <div className="divide-y divide-[var(--border)]">
              {!isLoadingResources && !hasContent && (
                <div className="p-6 text-center text-[var(--muted-foreground)] text-sm">
                  No content in this module yet
                </div>
              )}
              {module.assignments.length === 0 && resources.length > 0 && (
                <div className="p-4 text-center text-[var(--muted-foreground)] text-sm">
                  No assignments in this module
                </div>
              )}
              {module.assignments.length > 0 && (
                <>
                  {resources.length > 0 && (
                    <div className="px-4 pt-4 pb-2">
                      <h3 className="text-xs font-medium text-[var(--muted-foreground)] uppercase tracking-wide">
                        Assignments
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
      <PdfPreviewModal
        isOpen={previewResource !== null}
        onClose={closePreview}
        title={previewResource?.title || "PDF preview"}
        fileName={previewResource?.file_name}
        blob={previewBlob}
        isLoading={isPreviewLoading}
        error={previewError}
        onRetry={
          previewResource
            ? () => {
                void openPdfPreview(previewResource);
              }
            : undefined
        }
        onDownload={
          previewResource
            ? () => {
                void handleDownload(previewResource);
              }
            : undefined
        }
      />
    </motion.div>
  );
}

interface AssignmentRowProps {
  assignment: Assignment;
  courseId: number;
}

function AssignmentRow({ assignment, courseId }: AssignmentRowProps) {
  const dueDateRaw = assignment.effective_due_date ?? assignment.due_date;
  const dueDate = dueDateRaw ? new Date(dueDateRaw) : null;
  const nowMs = NOW_MS;
  const hasExtension = Boolean(assignment.has_extension && assignment.effective_due_date);

  const isPastDue = dueDate ? dueDate.getTime() < nowMs : false;
  const isUpcoming = dueDate
    ? dueDate.getTime() > nowMs && dueDate.getTime() - nowMs < 7 * 24 * 60 * 60 * 1000
    : false; // within 7 days

  return (
    <Link
      href={`/dashboard/courses/${courseId}/assignments/${assignment.id}`}
      className="group flex items-center gap-4 p-4 hover:bg-[var(--background)] transition-colors"
    >
      <div
        className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${
          isPastDue
            ? "bg-[var(--secondary)]/10"
            : isUpcoming
            ? "bg-[var(--warning)]/10"
            : "bg-[var(--primary)]/10"
        }`}
      >
        <FileText
          className={`w-5 h-5 ${
            isPastDue
              ? "text-[var(--secondary)]"
              : isUpcoming
              ? "text-[var(--warning)]"
              : "text-[var(--primary)]"
          }`}
        />
      </div>

      <div className="flex-1 min-w-0">
        <h3 className="font-medium text-[var(--foreground)] group-hover:text-[var(--primary)] transition-colors">
          {assignment.title}
        </h3>
        <div className="flex items-center gap-3 mt-1">
          {dueDate && (
            <span
              className={`flex items-center gap-1 text-xs ${
                isPastDue
                  ? "text-[var(--secondary)]"
                  : isUpcoming
                  ? "text-[var(--warning)]"
                  : "text-[var(--muted-foreground)]"
              }`}
            >
              <Clock className="w-3 h-3" />
              {isPastDue ? "Past due: " : "Due: "}
              {dueDate.toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
          )}
          <span className="text-xs text-[var(--muted-foreground)]">
            {assignment.max_points} pts
          </span>
          {hasExtension && (
            <span className="text-xs font-medium text-[var(--secondary)] bg-[var(--secondary)]/12 px-1.5 py-0.5 rounded">
              Extension
            </span>
          )}
        </div>
      </div>

      <ChevronRight className="w-5 h-5 text-[var(--muted-foreground)] group-hover:text-[var(--primary)] group-hover:translate-x-1 transition-all" />
    </Link>
  );
}
