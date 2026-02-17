import StudentAssignmentDetailClient from "@/components/dashboard/student/StudentAssignmentDetailClient";
import { ApiError, type Assignment, type Course, type Submission } from "@/lib/api";
import { serverApiFetch } from "@/lib/api/server";

interface PageProps {
  params: {
    id: string;
    assignmentId: string;
  };
}

function sortNewestFirst(submissions: Submission[]) {
  return submissions
    .slice()
    .sort((a, b) => new Date(b.submitted_at).getTime() - new Date(a.submitted_at).getTime());
}

export default async function AssignmentDetailPage({ params }: PageProps) {
  const courseId = Number(params.id);
  const assignmentId = Number(params.assignmentId);

  let initialCourse: Course | null = null;
  let initialAssignment: Assignment | null = null;
  let initialSubmissions: Submission[] = [];
  let initialError = "";

  if (!courseId || Number.isNaN(courseId) || !assignmentId || Number.isNaN(assignmentId)) {
    initialError = "Invalid course or assignment ID";
  } else {
    try {
      const [course, assignments, submissions] = await Promise.all([
        serverApiFetch<Course>(`/api/v1/student/courses/${courseId}`),
        serverApiFetch<Assignment[]>(`/api/v1/student/courses/${courseId}/assignments`),
        serverApiFetch<Submission[]>(
          `/api/v1/student/courses/${courseId}/assignments/${assignmentId}/submissions`
        ),
      ]);

      const assignment = assignments.find((item) => item.id === assignmentId) ?? null;
      if (!assignment) {
        initialError = "Assignment not found";
      } else {
        initialCourse = course;
        initialAssignment = assignment;
        initialSubmissions = sortNewestFirst(submissions);
      }
    } catch (error) {
      if (error instanceof ApiError) {
        if (error.status === 404) {
          initialError = "Assignment not found";
        } else if (error.status === 403) {
          initialError = "You don't have access to this assignment";
        } else {
          initialError = error.detail;
        }
      } else {
        initialError = "Failed to load assignment data";
      }
    }
  }

  return (
    <StudentAssignmentDetailClient
      courseId={courseId}
      assignmentId={assignmentId}
      initialCourse={initialCourse}
      initialAssignment={initialAssignment}
      initialSubmissions={initialSubmissions}
      initialError={initialError}
    />
  );
}
