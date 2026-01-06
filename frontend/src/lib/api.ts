/**
 * Typed API client for FastAPI backend
 * All requests include credentials for cookie-based auth
 */

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

/* ============================================
   TYPES (mirrored from Pydantic schemas)
   ============================================ */

export interface User {
  id: number;
  email: string;
  is_superadmin: boolean;
  org_admin_of: number[];
  course_roles: { course_id: number; role: "owner" | "co_lecturer" | "ta" | "student" }[];
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface AcceptInviteRequest {
  token: string;
  password: string;
}

export interface Course {
  id: number;
  title: string;
  code: string;
  description: string | null;
  semester: string | null;
  year: number | null;
  organization_id: number;
  created_at: string;
  updated_at: string;
}

export interface Module {
  id: number;
  title: string;
  description: string | null;
  position: number;
  course_id: number;
}

export interface Assignment {
  id: number;
  title: string;
  description: string | null;
  due_date: string | null;
  max_points: number;
  module_id: number;
}

export interface Submission {
  id: number;
  assignment_id: number;
  user_id: number;
  file_path: string;
  submitted_at: string;
  score: number | null;
  feedback: string | null;
  status: "pending" | "grading" | "graded" | "error";
}

export interface InvitePreview {
  status: "valid" | "expired" | "used";
  expires_at: string;
  organization_name: string | null;
  course_id: number | null;
  course_code: string | null;
  course_title: string | null;
}

export interface Organization {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface OrganizationCreate {
  name: string;
}

export interface CourseCreateInOrg {
  code: string;
  title: string;
  description?: string | null;
}

export interface CourseUpdate {
  code?: string | null;
  title?: string | null;
  description?: string | null;
}

export interface ModuleCreate {
  title: string;
  position: number;
}

export interface ModuleUpdate {
  title?: string | null;
  position?: number | null;
}

export interface AssignmentCreate {
  title: string;
  description?: string | null;
  module_id?: number | null;
}

export interface AssignmentUpdate {
  title?: string | null;
  description?: string | null;
  module_id?: number | null;
}

export interface CourseMembership {
  id: number;
  course_id: number;
  user_id: number;
  role: "owner" | "co_lecturer" | "ta" | "student";
  student_number: string | null;
}

export interface CourseMembershipCreate {
  user_id: number;
  role: "owner" | "co_lecturer" | "ta" | "student";
}

export interface ImportCsvResult {
  created_invites: number;
  auto_enrolled: number;
  issues: Record<string, unknown>[];
  invite_links: string[];
}

export interface StaffSubmissionQueueItem {
  id: number;
  course_id: number;
  course_code: string;
  course_title: string;
  assignment_id: number;
  assignment_title: string;
  max_points: number;
  student_user_id: number;
  student_email: string;
  student_full_name: string | null;
  student_programme: string | null;
  student_number: string | null;
  file_name: string;
  submitted_at: string;
  status: "pending" | "grading" | "graded" | "error";
  score: number | null;
  feedback: string | null;
}

export interface StaffSubmissionDetail extends StaffSubmissionQueueItem {
  content_type: string | null;
  size_bytes: number;
}

export interface StaffSubmissionUpdate {
  status?: "pending" | "grading" | "graded" | "error";
  score?: number | null;
  feedback?: string | null;
}

/* ============================================
   API ERROR HANDLING
   ============================================ */

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "An error occurred";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, detail);
  }
  
  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }
  
  return response.json();
}

/* ============================================
   AUTH ENDPOINTS
   ============================================ */

export const auth = {
  async login(data: LoginRequest): Promise<User> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },

  async me(): Promise<User> {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: "include",
    });
    return handleResponse<User>(res);
  },

  async acceptInvite(data: AcceptInviteRequest): Promise<User> {
    const res = await fetch(`${API_BASE}/api/v1/auth/invite/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },
};

/* ============================================
   STUDENT ENDPOINTS
   ============================================ */

export const student = {
  async getCourses(): Promise<Course[]> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses`, {
      credentials: "include",
    });
    return handleResponse<Course[]>(res);
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

  async getSubmissions(courseId: number, assignmentId: number): Promise<Submission[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/courses/${courseId}/assignments/${assignmentId}/submissions`,
      { credentials: "include" }
    );
    return handleResponse<Submission[]>(res);
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
};

/* ============================================
   ORG ADMIN ENDPOINTS (organization-wide management)
   ============================================ */

export const orgs = {
  async list(offset = 0, limit = 100): Promise<Organization[]> {
    const res = await fetch(`${API_BASE}/api/v1/orgs?offset=${offset}&limit=${limit}`, {
      credentials: "include",
    });
    return handleResponse<Organization[]>(res);
  },

  async create(data: OrganizationCreate): Promise<Organization> {
    const res = await fetch(`${API_BASE}/api/v1/orgs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Organization>(res);
  },
};

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
};

/* ============================================
   COURSE STAFF ENDPOINTS (owner/co_lecturer/ta)
   ============================================ */

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

  async listModules(courseId: number, offset = 0, limit = 100): Promise<Module[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/modules?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Module[]>(res);
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
};

export const staffSubmissions = {
  async listQueue(params?: {
    course_id?: number;
    status?: "pending" | "grading" | "graded" | "error";
    offset?: number;
    limit?: number;
  }): Promise<StaffSubmissionQueueItem[]> {
    const query = new URLSearchParams();
    if (params?.course_id !== undefined) query.set("course_id", String(params.course_id));
    if (params?.status) query.set("status_filter", params.status);
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));

    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/staff/submissions${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<StaffSubmissionQueueItem[]>(res);
  },

  async get(submissionId: number): Promise<StaffSubmissionDetail> {
    const res = await fetch(`${API_BASE}/api/v1/staff/submissions/${submissionId}`, {
      credentials: "include",
    });
    return handleResponse<StaffSubmissionDetail>(res);
  },

  async update(submissionId: number, data: StaffSubmissionUpdate): Promise<Submission> {
    const res = await fetch(`${API_BASE}/api/v1/staff/submissions/${submissionId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Submission>(res);
  },

  async download(submissionId: number): Promise<Blob> {
    const res = await fetch(`${API_BASE}/api/v1/staff/submissions/${submissionId}/download`, {
      credentials: "include",
    });
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

/* ============================================
   INVITE INFO (public, no auth required)
   ============================================ */

export const invites = {
  async preview(token: string): Promise<InvitePreview> {
    const res = await fetch(
      `${API_BASE}/api/v1/invites/preview?token=${encodeURIComponent(token)}`,
      { credentials: "include" }
    );
    return handleResponse<InvitePreview>(res);
  },
};
