import { API_BASE, ApiError, handleResponse } from "./core";
import type { Assignment, AssignmentCreate, AssignmentUpdate, Course, CourseMembership, CourseMembershipCreate, CourseMembershipUpdate, CourseNotificationPreferences, CourseStudentInviteByEmail, CourseUpdate, ImportCsvResult, MissingStudentOut, MissingSubmissionsSummaryItem, Module, ModuleCreate, ModuleResource, ModuleResourceLinkCreate, ModuleResourceUpdate, ModuleUpdate, OrgMembership, StaffCalendarEvent, TestCase, TestCaseCreate, TestCaseUpdate } from "./types";

export const courseStaff = {
  async listCourses(offset = 0, limit = 100): Promise<Course[]> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses?offset=${offset}&limit=${limit}`, {
      credentials: "include",
    });
    return handleResponse<Course[]>(res);
  },

  async getCourse(courseId: number): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}`, {
      credentials: "include",
    });
    return handleResponse<Course>(res);
  },

  async updateCourse(courseId: number, data: CourseUpdate): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Course>(res);
  },

  async getNotificationPreferences(courseId: number): Promise<CourseNotificationPreferences> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/notification-preferences`,
      { credentials: "include" }
    );
    return handleResponse<CourseNotificationPreferences>(res);
  },

  async setNotificationPreferences(
    courseId: number,
    data: Pick<CourseNotificationPreferences, "notify_new_submissions">
  ): Promise<CourseNotificationPreferences> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/notification-preferences`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<CourseNotificationPreferences>(res);
  },

  async listModules(courseId: number, offset = 0, limit = 100): Promise<Module[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Module[]>(res);
  },

  async listOrgMembers(courseId: number, offset = 0, limit = 200): Promise<OrgMembership[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/org-members?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<OrgMembership[]>(res);
  },

  async createModule(courseId: number, data: ModuleCreate): Promise<Module> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Module>(res);
  },

  async updateModule(courseId: number, moduleId: number, data: ModuleUpdate): Promise<Module> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Module>(res);
  },

  async deleteModule(courseId: number, moduleId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },

  async listAssignments(courseId: number, offset = 0, limit = 100): Promise<Assignment[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Assignment[]>(res);
  },

  async getAssignment(courseId: number, assignmentId: number): Promise<Assignment> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}`, {
      credentials: "include",
    });
    return handleResponse<Assignment>(res);
  },

  async createAssignment(courseId: number, data: AssignmentCreate): Promise<Assignment> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment>(res);
  },

  async updateAssignment(courseId: number, assignmentId: number, data: AssignmentUpdate): Promise<Assignment> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment>(res);
  },

  async deleteAssignment(courseId: number, assignmentId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },

  async getCalendarEvents(params?: {
    course_id?: number;
    starts_at?: string;
    ends_at?: string;
    limit?: number;
  }): Promise<StaffCalendarEvent[]> {
    const query = new URLSearchParams();
    if (params?.course_id !== undefined) query.set("course_id", String(params.course_id));
    if (params?.starts_at) query.set("starts_at", params.starts_at);
    if (params?.ends_at) query.set("ends_at", params.ends_at);
    if (params?.limit !== undefined) query.set("limit", String(params.limit));
    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/staff/calendar/events${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<StaffCalendarEvent[]>(res);
  },

  async listTestCases(
    courseId: number,
    assignmentId: number,
    offset = 0,
    limit = 200
  ): Promise<TestCase[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/testcases?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<TestCase[]>(res);
  },

  async createTestCase(
    courseId: number,
    assignmentId: number,
    data: TestCaseCreate
  ): Promise<TestCase> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/testcases`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<TestCase>(res);
  },

  async updateTestCase(
    courseId: number,
    assignmentId: number,
    testCaseId: number,
    data: TestCaseUpdate
  ): Promise<TestCase> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/testcases/${testCaseId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<TestCase>(res);
  },

  async deleteTestCase(
    courseId: number,
    assignmentId: number,
    testCaseId: number
  ): Promise<void> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/testcases/${testCaseId}`,
      { method: "DELETE", credentials: "include" }
    );
    return handleResponse<void>(res);
  },

  async listMemberships(courseId: number, offset = 0, limit = 100): Promise<CourseMembership[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/memberships?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<CourseMembership[]>(res);
  },

  async enrollUser(courseId: number, data: CourseMembershipCreate): Promise<CourseMembership> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<CourseMembership>(res);
  },

  async updateMembership(
    courseId: number,
    membershipId: number,
    data: CourseMembershipUpdate
  ): Promise<CourseMembership> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/memberships/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<CourseMembership>(res);
  },

  async removeMembership(courseId: number, membershipId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/memberships/${membershipId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },

  async importRosterCsv(courseId: number, file: File): Promise<ImportCsvResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/invites/import-csv`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return handleResponse<ImportCsvResult>(res);
  },

  async inviteStudentByEmail(
    courseId: number,
    data: CourseStudentInviteByEmail
  ): Promise<ImportCsvResult> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/invites/by-email`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<ImportCsvResult>(res);
  },

  async missingSubmissionsSummary(courseId: number): Promise<MissingSubmissionsSummaryItem[]> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/missing-submissions`, {
      credentials: "include",
    });
    return handleResponse<MissingSubmissionsSummaryItem[]>(res);
  },

  async missingSubmissions(courseId: number, assignmentId: number): Promise<MissingStudentOut[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/missing-submissions/${assignmentId}`,
      { credentials: "include" }
    );
    return handleResponse<MissingStudentOut[]>(res);
  },

  // Module resources (staff - includes unpublished)
  async listModuleResources(courseId: number, moduleId: number): Promise<ModuleResource[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}/resources`,
      { credentials: "include" }
    );
    return handleResponse<ModuleResource[]>(res);
  },

  async createLinkResource(
    courseId: number,
    moduleId: number,
    data: ModuleResourceLinkCreate
  ): Promise<ModuleResource> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}/resources/link`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<ModuleResource>(res);
  },

  async uploadFileResource(
    courseId: number,
    moduleId: number,
    file: File,
    title: string,
    position?: number,
    isPublished?: boolean
  ): Promise<ModuleResource> {
    const form = new FormData();
    form.append("file", file);
    form.append("title", title);
    if (position !== undefined) form.append("position", String(position));
    if (isPublished !== undefined) form.append("is_published", String(isPublished));

    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}/resources/file`,
      {
        method: "POST",
        credentials: "include",
        body: form,
      }
    );
    return handleResponse<ModuleResource>(res);
  },

  async updateModuleResource(
    courseId: number,
    moduleId: number,
    resourceId: number,
    data: ModuleResourceUpdate
  ): Promise<ModuleResource> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<ModuleResource>(res);
  },

  async deleteModuleResource(courseId: number, moduleId: number, resourceId: number): Promise<void> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}/resources/${resourceId}`,
      {
        method: "DELETE",
        credentials: "include",
      }
    );
    return handleResponse<void>(res);
  },

  async downloadModuleResource(courseId: number, moduleId: number, resourceId: number): Promise<Blob> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules/${moduleId}/resources/${resourceId}/download`,
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
