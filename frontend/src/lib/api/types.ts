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
  github_classroom_id?: number | null;
  github_classroom_name?: string | null;
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
  effective_due_date?: string | null;
  has_extension?: boolean;
  max_points: number;
  module_id: number | null;
  late_policy?: LatePolicy | null;
  autograde_mode: "practice_only" | "final_only" | "hybrid";
  allows_zip: boolean;
  expected_filename: string | null;
  compile_command: string | null;
}

export interface CalendarEventBase {
  assignment_id: number;
  assignment_title: string;
  course_id: number;
  course_code: string;
  course_title: string;
  due_date: string;
}

export interface StudentCalendarEvent extends CalendarEventBase {
  effective_due_date: string;
  has_extension: boolean;
}

export type StaffCalendarEvent = CalendarEventBase;

export interface Submission {
  id: number;
  assignment_id: number;
  user_id: number;
  file_path: string;
  file_name?: string | null;
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

export interface TestCase {
  id: number;
  assignment_id: number;
  name: string;
  position: number;
  points: number;
  is_hidden: boolean;
  stdin: string;
  expected_stdout: string;
  expected_stderr: string;
  created_at: string;
}

export interface TestCaseCreate {
  name: string;
  position?: number;
  points?: number;
  is_hidden?: boolean;
  stdin?: string;
  expected_stdout?: string;
  expected_stderr?: string;
}

export interface TestCaseUpdate {
  name?: string;
  position?: number;
  points?: number;
  is_hidden?: boolean;
  stdin?: string;
  expected_stdout?: string;
  expected_stderr?: string;
}

export interface AssignmentExtension {
  id: number;
  assignment_id: number;
  user_id: number;
  extended_due_date: string;
  created_at: string;
  updated_at: string;
}

export interface AssignmentExtensionUpsert {
  extended_due_date: string;
}

export interface SubmissionTestResult {
  id: number;
  submission_id: number;
  test_case_id: number;
  passed: boolean;
  outcome: number;
  compile_output: string;
  stdout: string;
  stderr: string;
  created_at: string;
}

export interface StudentVisibleTestResult {
  test_case_id: number;
  name: string;
  position: number;
  points: number;
  passed: boolean;
  outcome: number;
  stdin: string;
  expected_stdout: string;
  expected_stderr: string;
  stdout: string;
  stderr: string;
}

export interface StudentSubmissionTests {
  submission_id: number;
  compile_output: string;
  tests: StudentVisibleTestResult[];
}

export interface Organization {
  id: number;
  name: string;
  github_org_login?: string | null;
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

export interface OrganizationUpdate {
  name?: string | null;
  github_org_login?: string | null;
}

export interface OrgGitHubAdminConnection {
  user_id: number;
  github_user_id: number;
  github_login: string;
  token_expires_at: string;
  last_verified_at: string | null;
  revoked_at: string | null;
}

export interface OrgGitHubStatus {
  github_org_login: string | null;
  connected_admins: OrgGitHubAdminConnection[];
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
  github_classroom_id?: number | null;
  github_classroom_name?: string | null;
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
  autograde_mode?: "practice_only" | "final_only" | "hybrid";
  allows_zip?: boolean;
  expected_filename?: string | null;
  compile_command?: string | null;
}

export interface AssignmentUpdate {
  title?: string | null;
  description?: string | null;
  module_id?: number | null;
  due_date?: string | null;
  max_points?: number | null;
  autograde_mode?: "practice_only" | "final_only" | "hybrid" | null;
  allows_zip?: boolean | null;
  expected_filename?: string | null;
  compile_command?: string | null;
}

export interface CourseMembership {
  id: number;
  course_id: number;
  user_id: number;
  user_email?: string | null;
  role: "owner" | "co_lecturer" | "ta" | "student";
  student_number?: string | null;
  github_user_id?: number | null;
  github_login?: string | null;
  github_linked_at?: string | null;
  github_linked_by_user_id?: number | null;
}

export interface CourseGitHubClaim {
  id: number;
  course_id: number;
  course_membership_id: number;
  github_user_id: number;
  github_login: string;
  status: "pending" | "approved" | "rejected";
  created_at: string;
  reviewed_by_user_id?: number | null;
  reviewed_at?: string | null;
}

export interface GitHubClassroom {
  id: number;
  name: string;
  archived_at?: string | null;
}

export interface GitHubClassroomAssignment {
  id: number;
  title: string;
  invite_link?: string | null;
  deadline?: string | null;
}

export interface GitHubMissingLinkStudent {
  membership_id: number;
  user_id: number;
  user_email?: string | null;
  student_number?: string | null;
}

export interface GitHubRosterSync {
  course_id: number;
  bound_classroom_id?: number | null;
  bound_classroom_name?: string | null;
  selected_classroom_id?: number | null;
  selected_assignment_id?: number | null;
  classrooms: GitHubClassroom[];
  assignments: GitHubClassroomAssignment[];
  linked_students_total: number;
  accepted_students_total: number;
  matched_logins: string[];
  missing_logins: string[];
  extra_logins: string[];
  missing_github_students: GitHubMissingLinkStudent[];
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

export interface ImportCsvIssue {
  email: string;
  reason: string;
  row_number?: number | null;
  full_name?: string | null;
  student_number?: string | null;
  programme?: string | null;
}

export interface ImportCsvResult {
  created_invites: number;
  auto_enrolled: number;
  issues: ImportCsvIssue[];
  invite_links: string[];
}

export interface CourseStudentInviteByEmail {
  email: string;
  full_name: string;
  student_number: string;
  programme: string;
}

export interface CourseNotificationPreferences {
  course_id: number;
  notify_new_submissions: boolean;
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

export interface ZipEntry {
  name: string;
  size: number;
}

export interface ZipContents {
  files: ZipEntry[];
  total_size: number;
  file_count: number;
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
