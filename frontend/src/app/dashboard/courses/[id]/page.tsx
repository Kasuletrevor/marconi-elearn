import StudentCourseDetailClient from "@/components/dashboard/student/StudentCourseDetailClient";
import { ApiError, type Assignment, type Course, type CourseGitHubClaim, type Module } from "@/lib/api";
import { serverApiFetch } from "@/lib/api/server";

interface PageProps {
  params: {
    id: string;
  };
}

interface GitHubStatus {
  connected: boolean;
  github_user_id: number | null;
  github_login: string | null;
  github_connected_at: string | null;
}

export default async function CourseDetailPage({ params }: PageProps) {
  const courseId = Number(params.id);

  let initialCourse: Course | null = null;
  let initialModules: Module[] = [];
  let initialAssignments: Assignment[] = [];
  let initialGitHubStatus: GitHubStatus | null = null;
  let initialCourseGitHubClaim: CourseGitHubClaim | null = null;
  let initialError = "";

  if (!courseId || Number.isNaN(courseId)) {
    initialError = "Invalid course ID";
  } else {
    try {
      [initialCourse, initialModules, initialAssignments] = await Promise.all([
        serverApiFetch<Course>(`/api/v1/student/courses/${courseId}`),
        serverApiFetch<Module[]>(`/api/v1/student/courses/${courseId}/modules`),
        serverApiFetch<Assignment[]>(`/api/v1/student/courses/${courseId}/assignments`),
      ]);

      try {
        [initialGitHubStatus, initialCourseGitHubClaim] = await Promise.all([
          serverApiFetch<GitHubStatus>("/api/v1/integrations/github/user/status"),
          serverApiFetch<CourseGitHubClaim | null>(`/api/v1/student/courses/${courseId}/github/claim`),
        ]);
      } catch {
        // GitHub linking is optional for rendering this page.
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          initialError = "Course not found";
        } else if (error.status === 403) {
          initialError = "You don't have access to this course";
        } else {
          initialError = error.detail;
        }
      } else {
        initialError = "Failed to load course data";
      }
    }
  }

  return (
    <StudentCourseDetailClient
      courseId={courseId}
      initialCourse={initialCourse}
      initialModules={initialModules}
      initialAssignments={initialAssignments}
      initialGitHubStatus={initialGitHubStatus}
      initialCourseGitHubClaim={initialCourseGitHubClaim}
      initialError={initialError}
    />
  );
}
