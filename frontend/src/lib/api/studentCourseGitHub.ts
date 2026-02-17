import { API_BASE, handleResponse } from "./core";
import type { CourseGitHubClaim } from "./types";

export const studentCourseGitHub = {
  async getClaim(courseId: number): Promise<CourseGitHubClaim | null> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses/${courseId}/github/claim`, {
      credentials: "include",
    });
    return handleResponse<CourseGitHubClaim | null>(res);
  },

  async createOrUpdateClaim(courseId: number): Promise<CourseGitHubClaim> {
    const res = await fetch(`${API_BASE}/api/v1/student/courses/${courseId}/github/claim`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<CourseGitHubClaim>(res);
  },
};
