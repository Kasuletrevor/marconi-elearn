import { API_BASE, ApiError, handleResponse } from "./core";
import type { Assignment, Course, Module, ModuleResource, StudentCalendarEvent, StudentSubmissionTests, Submission } from "./types";

export const student = {
  async getCourses(): Promise<Course[]> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses`, {
      credentials: "include",
    });
    return handleResponse<Course[]>(res);
  },

  async joinCourseByCode(data: {
    code: string;
    full_name: string;
    student_number: string;
    programme: string;
  }): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses/join`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Course>(res);
  },

  async getCourse(courseId: number): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses/${courseId}`, {
      credentials: "include",
    });
    return handleResponse<Course>(res);
  },

  async getModules(courseId: number): Promise<Module[]> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses/${courseId}/modules`, {
      credentials: "include",
    });
    return handleResponse<Module[]>(res);
  },

  async getAssignments(courseId: number): Promise<Assignment[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/courses/${courseId}/assignments`,
      { credentials: "include" }
    );
    return handleResponse<Assignment[]>(res);
  },

  async getCalendarEvents(params?: {
    course_id?: number;
    starts_at?: string;
    ends_at?: string;
    limit?: number;
  }): Promise<StudentCalendarEvent[]> {
    const query = new URLSearchParams();
    if (params?.course_id !== undefined) query.set("course_id", String(params.course_id));
    if (params?.starts_at) query.set("starts_at", params.starts_at);
    if (params?.ends_at) query.set("ends_at", params.ends_at);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/student/calendar/events${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<StudentCalendarEvent[]>(res);
  },

  async getSubmissions(courseId: number, assignmentId: number): Promise<Submission[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/courses/${courseId}/assignments/${assignmentId}/submissions`,
      { credentials: "include" }
    );
    return handleResponse<Submission[]>(res);
  },

  async getSubmissionTests(
    courseId: number,
    assignmentId: number,
    submissionId: number
  ): Promise<StudentSubmissionTests> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/courses/${courseId}/assignments/${assignmentId}/submissions/${submissionId}/tests`,
      { credentials: "include" }
    );
    return handleResponse<StudentSubmissionTests>(res);
  },

  async submitAssignment(
    courseId: number,
    assignmentId: number,
    file: File
  ): Promise<Submission> {
    const formData = new FormData();
    formData.append("file", file);

    const res = await fetch(
      `${API_BASE}/api/v1/student/courses/${courseId}/assignments/${assignmentId}/submissions`,
      {
        method: "POST",
        credentials: "include",
        body: formData,
      }
    );
    return handleResponse<Submission>(res);
  },

  // Module resources (published only)
  async getModuleResources(courseId: number, moduleId: number): Promise<ModuleResource[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/courses/${courseId}/modules/${moduleId}/resources`,
      { credentials: "include" }
    );
    return handleResponse<ModuleResource[]>(res);
  },

  async downloadResource(resourceId: number): Promise<Blob> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/resources/${resourceId}/download`,
      { credentials: "include" }
    );
    if (!res.ok) {
      let detail = "Failed to download file";
      try {
        const data = await res.json();
        detail = data.detail || detail;
      } catch {
        // ignore
      }
      throw new ApiError(res.status, detail);
    }
    return res.blob();
  },
};
