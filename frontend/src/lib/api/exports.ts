/**
 * CSV & PDF export API methods for staff and students.
 *
 * These trigger browser downloads by opening the endpoint as a blob URL.
 */

import { API_BASE } from "./core";

async function downloadCsv(path: string, filename: string): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    credentials: "include",
  });
  if (!res.ok) {
    let detail = "Export failed";
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

async function downloadBlob(
  path: string,
  filename: string,
  errorMsg = "Download failed"
): Promise<void> {
  const res = await fetch(`${API_BASE}/api/v1${path}`, {
    credentials: "include",
  });
  if (!res.ok) {
    let detail = errorMsg;
    try {
      const data = await res.json();
      detail = data.detail || detail;
    } catch {
      // ignore
    }
    throw new Error(detail);
  }
  const blob = await res.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const exports = {
  gradebook(courseId: number): Promise<void> {
    return downloadCsv(
      `/staff/courses/${courseId}/export/gradebook`,
      `gradebook_${courseId}.csv`
    );
  },

  roster(courseId: number): Promise<void> {
    return downloadCsv(
      `/staff/courses/${courseId}/export/roster`,
      `roster_${courseId}.csv`
    );
  },

  submissions(
    courseId: number,
    assignmentId?: number
  ): Promise<void> {
    const params = assignmentId
      ? `?assignment_id=${assignmentId}`
      : "";
    return downloadCsv(
      `/staff/courses/${courseId}/export/submissions${params}`,
      `submissions_${courseId}.csv`
    );
  },

  audit(courseId: number): Promise<void> {
    return downloadCsv(
      `/staff/courses/${courseId}/export/audit`,
      `audit_${courseId}.csv`
    );
  },

  assignmentPdf(courseId: number, assignmentId: number, title?: string): Promise<void> {
    const safeName = (title || "assignment").replace(/\s+/g, "_").slice(0, 50);
    return downloadBlob(
      `/student/courses/${courseId}/assignments/${assignmentId}/pdf`,
      `${safeName}.pdf`,
      "PDF download failed"
    );
  },
};
