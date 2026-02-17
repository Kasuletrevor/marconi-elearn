import { API_BASE, handleResponse } from "./core";
import type { Assignment, AssignmentCreate, AssignmentUpdate, Course, CourseCreateInOrg, CourseMembership, CourseMembershipCreate, CourseMembershipUpdate, CourseUpdate, ImportCsvResult, Module, ModuleCreate, ModuleUpdate, OrgMembership, OrgMembershipCreate, OrgMembershipInviteResult, OrgMembershipUpdate } from "./types";

export const staff = {
  // Courses (nested under org)
  async listCourses(orgId: number, offset = 0, limit = 100): Promise<Course[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Course[]>(res);
  },

  async getCourse(orgId: number, courseId: number): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}`, {
      credentials: "include",
    });
    return handleResponse<Course>(res);
  },

  async createCourse(orgId: number, data: CourseCreateInOrg): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Course>(res);
  },

  async updateCourse(orgId: number, courseId: number, data: CourseUpdate): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Course>(res);
  },

  async deleteCourse(orgId: number, courseId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },

  // Modules
  async listModules(orgId: number, courseId: number, offset = 0, limit = 100): Promise<Module[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/modules?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Module[]>(res);
  },

  async createModule(orgId: number, courseId: number, data: ModuleCreate): Promise<Module> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/modules`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Module>(res);
  },

  async updateModule(
    orgId: number,
    courseId: number,
    moduleId: number,
    data: ModuleUpdate
  ): Promise<Module> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/modules/${moduleId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<Module>(res);
  },

  async deleteModule(orgId: number, courseId: number, moduleId: number): Promise<void> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/modules/${moduleId}`,
      { method: "DELETE", credentials: "include" }
    );
    return handleResponse<void>(res);
  },

  // Assignments
  async listAssignments(orgId: number, courseId: number, offset = 0, limit = 100): Promise<Assignment[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/assignments?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Assignment[]>(res);
  },

  async getAssignment(orgId: number, courseId: number, assignmentId: number): Promise<Assignment> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/assignments/${assignmentId}`,
      { credentials: "include" }
    );
    return handleResponse<Assignment>(res);
  },

  async createAssignment(orgId: number, courseId: number, data: AssignmentCreate): Promise<Assignment> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/assignments`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Assignment>(res);
  },

  async updateAssignment(
    orgId: number,
    courseId: number,
    assignmentId: number,
    data: AssignmentUpdate
  ): Promise<Assignment> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/assignments/${assignmentId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<Assignment>(res);
  },

  async deleteAssignment(orgId: number, courseId: number, assignmentId: number): Promise<void> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/assignments/${assignmentId}`,
      { method: "DELETE", credentials: "include" }
    );
    return handleResponse<void>(res);
  },

  // Roster / memberships
  async listMemberships(orgId: number, courseId: number, offset = 0, limit = 100): Promise<CourseMembership[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/memberships?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<CourseMembership[]>(res);
  },

  async enrollUser(orgId: number, courseId: number, data: CourseMembershipCreate): Promise<CourseMembership> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<CourseMembership>(res);
  },

  async removeMembership(orgId: number, courseId: number, membershipId: number): Promise<void> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/memberships/${membershipId}`,
      { method: "DELETE", credentials: "include" }
    );
    return handleResponse<void>(res);
  },

  async updateMembership(
    orgId: number,
    courseId: number,
    membershipId: number,
    data: CourseMembershipUpdate
  ): Promise<CourseMembership> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/memberships/${membershipId}`,
      {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify(data),
      }
    );
    return handleResponse<CourseMembership>(res);
  },

  async importRosterCsv(orgId: number, courseId: number, file: File): Promise<ImportCsvResult> {
    const form = new FormData();
    form.append("file", file);
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/courses/${courseId}/invites/import-csv`, {
      method: "POST",
      credentials: "include",
      body: form,
    });
    return handleResponse<ImportCsvResult>(res);
  },

  // Organization memberships (org-wide roles)
  async listOrgMemberships(orgId: number, offset = 0, limit = 200): Promise<OrgMembership[]> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/memberships?offset=${offset}&limit=${limit}`, {
      credentials: "include",
    });
    return handleResponse<OrgMembership[]>(res);
  },

  async addOrgMembership(orgId: number, data: OrgMembershipCreate): Promise<OrgMembership> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/memberships`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<OrgMembership>(res);
  },

  async addOrgMembershipByEmail(
    orgId: number,
    data: { email: string; role: OrgMembership["role"] }
  ): Promise<OrgMembershipInviteResult> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/memberships/by-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<OrgMembershipInviteResult>(res);
  },

  async updateOrgMembership(orgId: number, membershipId: number, data: OrgMembershipUpdate): Promise<OrgMembership> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/memberships/${membershipId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<OrgMembership>(res);
  },

  async removeOrgMembership(orgId: number, membershipId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/memberships/${membershipId}`, {
      method: "DELETE",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },
};
