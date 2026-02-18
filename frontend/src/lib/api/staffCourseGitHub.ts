import { API_BASE, handleResponse } from "./core";
import type { CourseGitHubClaim, GitHubClassroom, GitHubRosterSync } from "./types";

export const staffCourseGitHub = {
  async listClassrooms(courseId: number): Promise<GitHubClassroom[]> {
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/github/classrooms`, {
      credentials: "include",
    });
    return handleResponse<GitHubClassroom[]>(res);
  },

  async getRosterSync(
    courseId: number,
    opts?: { classroom_id?: number; assignment_id?: number }
  ): Promise<GitHubRosterSync> {
    const query = new URLSearchParams();
    if (opts?.classroom_id !== undefined) query.set("classroom_id", String(opts.classroom_id));
    if (opts?.assignment_id !== undefined) query.set("assignment_id", String(opts.assignment_id));
    const qs = query.toString();
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/github/roster-sync${qs ? `?${qs}` : ""}`,
      { credentials: "include" }
    );
    return handleResponse<GitHubRosterSync>(res);
  },

  async listClaims(courseId: number, statusFilter?: CourseGitHubClaim["status"]): Promise<CourseGitHubClaim[]> {
    const qs = statusFilter ? `?status_filter=${encodeURIComponent(statusFilter)}` : "";
    const res = await fetch(`${API_BASE}/api/v1/staff/courses/${courseId}/github-claims${qs}`, {
      credentials: "include",
    });
    return handleResponse<CourseGitHubClaim[]>(res);
  },

  async approveClaim(courseId: number, claimId: number): Promise<CourseGitHubClaim> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/github-claims/${claimId}/approve`,
      { method: "POST", credentials: "include" }
    );
    return handleResponse<CourseGitHubClaim>(res);
  },

  async rejectClaim(courseId: number, claimId: number): Promise<CourseGitHubClaim> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/github-claims/${claimId}/reject`,
      { method: "POST", credentials: "include" }
    );
    return handleResponse<CourseGitHubClaim>(res);
  },
};
