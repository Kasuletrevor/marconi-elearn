import { API_BASE, ApiError, handleResponse } from "./core";
import type { Paginated, StaffNextSubmissionOut, StaffSubmissionDetail, StaffSubmissionQueueItem, StaffSubmissionsBulkRequest, StaffSubmissionsBulkResult, StaffSubmissionUpdate, Submission, SubmissionTestResult, ZipContents } from "./types";

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

  async zipContents(submissionId: number): Promise<ZipContents> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/submissions/${submissionId}/zip-contents`,
      { credentials: "include" }
    );
    return handleResponse<ZipContents>(res);
  },

  async tests(submissionId: number): Promise<SubmissionTestResult[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/submissions/${submissionId}/tests`,
      { credentials: "include" }
    );
    return handleResponse<SubmissionTestResult[]>(res);
  },

  async regrade(submissionId: number): Promise<Submission> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/submissions/${submissionId}/regrade`,
      { method: "POST", credentials: "include" }
    );
    return handleResponse<Submission>(res);
  },
};
