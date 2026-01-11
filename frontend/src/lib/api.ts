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
  org_roles: { org_id: number; role: "admin" | "lecturer" | "ta" }[];
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
  late_policy?: LatePolicy | null;
  self_enroll_enabled: boolean;
  self_enroll_code?: string | null;
  organization_id: number;
  created_at: string;
  updated_at: string;
}

export type LatePolicyType = "percent_per_day";

export interface LatePolicy {
  enabled: boolean;
  type: LatePolicyType;
  grace_minutes: number;
  percent_per_day: number;
  max_percent: number;
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
  module_id: number | null;
  late_policy?: LatePolicy | null;
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
  error_kind?: "compile_error" | "runtime_error" | "infra_error" | "internal_error" | null;
  effective_due_date?: string | null;
  late_seconds?: number | null;
  late_penalty_percent?: number | null;
}

export interface InvitePreview {
  status: "valid" | "expired" | "used";
  expires_at: string;
  organization_name: string | null;
  course_id: number | null;
  course_code: string | null;
  course_title: string | null;
}

export interface PlaygroundLanguage {
  id: string;
  version: string;
}

export interface PlaygroundRunRequest {
  language_id: string;
  source_code: string;
  stdin?: string;
}

export interface PlaygroundRunResponse {
  outcome: number;
  compile_output: string;
  stdout: string;
  stderr: string;
}

export interface Organization {
  id: number;
  name: string;
  created_at: string;
  updated_at: string;
}

export interface SuperadminStats {
  organizations_total: number;
  users_total: number;
  courses_total: number;
  submissions_total: number;
  submissions_today: number;
}

export interface AuditEvent {
  id: number;
  organization_id: number | null;
  actor_user_id: number | null;
  actor_email: string | null;
  action: string;
  target_type: string | null;
  target_id: number | null;
  metadata: Record<string, unknown> | null;
  created_at: string;
}

export interface OrganizationCreate {
  name: string;
}

export interface CourseCreateInOrg {
  code: string;
  title: string;
  description?: string | null;
  semester?: string | null;
  year?: number | null;
  late_policy?: LatePolicy | null;
}

export interface CourseUpdate {
  code?: string | null;
  title?: string | null;
  description?: string | null;
  semester?: string | null;
  year?: number | null;
  late_policy?: LatePolicy | null;
  self_enroll_enabled?: boolean | null;
  regenerate_self_enroll_code?: boolean | null;
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
  due_date?: string | null;
  max_points?: number;
}

export interface AssignmentUpdate {
  title?: string | null;
  description?: string | null;
  module_id?: number | null;
  due_date?: string | null;
  max_points?: number | null;
}

export interface CourseMembership {
  id: number;
  course_id: number;
  user_id: number;
  user_email?: string | null;
  role: "owner" | "co_lecturer" | "ta" | "student";
  student_number?: string | null;
}

export interface CourseMembershipCreate {
  user_id: number;
  role: "owner" | "co_lecturer" | "ta" | "student";
}

export interface CourseMembershipUpdate {
  role?: "owner" | "co_lecturer" | "ta" | "student" | null;
}

export interface OrgMembership {
  id: number;
  organization_id: number;
  user_id: number;
  user_email?: string | null;
  role: "admin" | "lecturer" | "ta";
}

export interface OrgMembershipCreate {
  user_id: number;
  role: "admin" | "lecturer" | "ta";
}

export interface OrgMembershipUpdate {
  role?: "admin" | "lecturer" | "ta" | null;
}

export interface OrgMembershipInviteResult extends OrgMembership {
  invite_link?: string | null;
}

export interface UserPublic {
  id: number;
  email: string;
}

export interface ImportCsvResult {
  created_invites: number;
  auto_enrolled: number;
  issues: Record<string, unknown>[];
  invite_links: string[];
}

export interface CourseStudentInviteByEmail {
  email: string;
  full_name: string;
  student_number: string;
  programme: string;
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

export interface Paginated<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
}

export type StaffSubmissionBulkAction = "mark_pending" | "mark_grading" | "mark_graded";

export interface StaffSubmissionsBulkRequest {
  submission_ids: number[];
  action: StaffSubmissionBulkAction;
}

export interface StaffSubmissionsBulkResult {
  updated_ids: number[];
  skipped_ids: number[];
}

export interface StaffNextSubmissionOut {
  submission_id: number | null;
}

export interface MissingSubmissionsSummaryItem {
  assignment_id: number;
  assignment_title: string;
  total_students: number;
  submitted_count: number;
  missing_count: number;
}

export interface MissingStudentOut {
  user_id: number;
  email: string;
  full_name: string | null;
  programme: string | null;
  student_number: string | null;
}

/* ============================================
   MODULE RESOURCES TYPES
   ============================================ */

export type ModuleResourceKind = "link" | "file";

export interface ModuleResource {
  id: number;
  module_id: number;
  title: string;
  kind: ModuleResourceKind;
  url: string | null;
  file_name: string | null;
  content_type: string | null;
  size_bytes: number | null;
  position: number;
  is_published: boolean;
  created_at: string;
}

export interface ModuleResourceLinkCreate {
  title: string;
  url: string;
  position?: number;
  is_published?: boolean;
}

export interface ModuleResourceUpdate {
  title?: string;
  url?: string;
  position?: number;
  is_published?: boolean;
}

/* ============================================
   STUDENT SUBMISSIONS TYPES (global view)
   ============================================ */

export interface StudentSubmission {
  id: number;
  assignment_id: number;
  assignment_title: string;
  course_id: number;
  course_code: string;
  course_title: string;
  file_name: string;
  submitted_at: string;
  status: "pending" | "grading" | "graded" | "error";
  score: number | null;
  max_points: number;
  feedback: string | null;
  error_kind?: "compile_error" | "runtime_error" | "infra_error" | "internal_error" | null;
  due_date?: string | null;
  effective_due_date?: string | null;
  late_seconds?: number | null;
  late_penalty_percent?: number | null;
}

/* ============================================
   NOTIFICATION TYPES
   ============================================ */

export type NotificationKind = "submission_graded";

export interface Notification {
  id: number;
  kind: NotificationKind;
  title: string;
  body: string | null;
  link_url: string | null;
  read_at: string | null;
  created_at: string;
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

/* ============================================
   STUDENT SUBMISSIONS (global view)
   ============================================ */

export const studentSubmissions = {
  async list(params?: {
    course_id?: number;
    assignment_id?: number;
    offset?: number;
    limit?: number;
  }): Promise<StudentSubmission[]> {
    const query = new URLSearchParams();
    if (params?.course_id !== undefined) query.set("course_id", String(params.course_id));
    if (params?.assignment_id !== undefined) query.set("assignment_id", String(params.assignment_id));
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));

    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/student/submissions${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<StudentSubmission[]>(res);
  },

  async download(submissionId: number): Promise<Blob> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/submissions/${submissionId}/download`,
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

/* ============================================
   STUDENT NOTIFICATIONS
   ============================================ */

export const notifications = {
  async list(params?: {
    unread_only?: boolean;
    offset?: number;
    limit?: number;
  }): Promise<Notification[]> {
    const query = new URLSearchParams();
    if (params?.unread_only) query.set("unread_only", "true");
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));

    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/student/notifications${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<Notification[]>(res);
  },

  async markRead(notificationId: number): Promise<Notification> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/notifications/${notificationId}/read`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    return handleResponse<Notification>(res);
  },
};

/* ============================================
   SUPERADMIN ENDPOINTS (platform-wide)
   ============================================ */

export const superadmin = {
  async listOrganizations(offset = 0, limit = 100): Promise<Organization[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/superadmin/organizations?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<Organization[]>(res);
  },

  async getStats(): Promise<SuperadminStats> {
    const res = await fetch(`${API_BASE}/api/v1/superadmin/stats`, {
      credentials: "include",
    });
    return handleResponse<SuperadminStats>(res);
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

export const audit = {
  async listOrgEvents(orgId: number, offset = 0, limit = 100): Promise<AuditEvent[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/audit?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<AuditEvent[]>(res);
  },
};

export const orgUsers = {
  async lookup(orgId: number, email: string): Promise<UserPublic> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/users/lookup?email=${encodeURIComponent(email)}`,
      { credentials: "include" }
    );
    return handleResponse<UserPublic>(res);
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

export const users = {
  async get(userId: number): Promise<UserPublic> {
    const res = await fetch(`${API_BASE}/api/v1/users/${userId}`, { credentials: "include" });
    return handleResponse<UserPublic>(res);
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

  async updateCourse(courseId: number, data: CourseUpdate): Promise<Course> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
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

  async listPage(params?: {
    course_id?: number;
    status?: "pending" | "grading" | "graded" | "error";
    offset?: number;
    limit?: number;
  }): Promise<Paginated<StaffSubmissionQueueItem>> {
    const query = new URLSearchParams();
    if (params?.course_id !== undefined) query.set("course_id", String(params.course_id));
    if (params?.status) query.set("status_filter", params.status);
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));

    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/staff/submissions/page${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<Paginated<StaffSubmissionQueueItem>>(res);
  },

  async bulkUpdate(data: StaffSubmissionsBulkRequest): Promise<StaffSubmissionsBulkResult> {
    const res = await fetch(`${API_BASE}/api/v1/staff/submissions/bulk`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<StaffSubmissionsBulkResult>(res);
  },

  async nextUngraded(params?: {
    course_id?: number;
    status?: "pending" | "grading" | "graded" | "error";
    after_submission_id?: number;
  }): Promise<StaffNextSubmissionOut> {
    const query = new URLSearchParams();
    if (params?.course_id !== undefined) query.set("course_id", String(params.course_id));
    if (params?.status) query.set("status_filter", params.status);
    if (params?.after_submission_id !== undefined)
      query.set("after_submission_id", String(params.after_submission_id));
    const qs = query.toString();

    const res = await fetch(`${API_BASE}/api/v1/staff/submissions/next${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<StaffNextSubmissionOut>(res);
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

/* ============================================
   PLAYGROUND (authenticated)
   ============================================ */

export const playground = {
  async listLanguages(): Promise<PlaygroundLanguage[]> {
    const res = await fetch(`${API_BASE}/api/v1/playground/languages`, {
      credentials: "include",
    });
    return handleResponse<PlaygroundLanguage[]>(res);
  },

  async run(data: PlaygroundRunRequest): Promise<PlaygroundRunResponse> {
    const res = await fetch(`${API_BASE}/api/v1/playground/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<PlaygroundRunResponse>(res);
  },
};
