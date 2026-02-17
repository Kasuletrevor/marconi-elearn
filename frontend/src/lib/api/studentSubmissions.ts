import { API_BASE, ApiError, handleResponse } from "./core";
import type { StudentSubmission } from "./types";

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
