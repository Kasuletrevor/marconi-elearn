/**
 * Frontend API client for plagiarism detection (MOSS).
 */

import { API_BASE, handleResponse } from "./core";
import type { PlagiarismRun, PlagiarismPair } from "./types";

export const plagiarism = {
  async startRun(
    courseId: number,
    assignmentId: number,
    language: string = "c"
  ): Promise<PlagiarismRun> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/plagiarism`,
      {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ language }),
      }
    );
    return handleResponse<PlagiarismRun>(res);
  },

  async listRuns(
    courseId: number,
    assignmentId: number,
    offset = 0,
    limit = 50
  ): Promise<PlagiarismRun[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/plagiarism?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<PlagiarismRun[]>(res);
  },

  async getRun(
    courseId: number,
    assignmentId: number,
    runId: number
  ): Promise<PlagiarismRun> {
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/plagiarism/${runId}`,
      { credentials: "include" }
    );
    return handleResponse<PlagiarismRun>(res);
  },

  async getPairs(
    courseId: number,
    assignmentId: number,
    runId: number,
    minSimilarity = 0,
    offset = 0,
    limit = 200
  ): Promise<PlagiarismPair[]> {
    const params = new URLSearchParams({
      min_similarity: String(minSimilarity),
      offset: String(offset),
      limit: String(limit),
    });
    const res = await fetch(
      `${API_BASE}/api/v1/staff/courses/${courseId}/assignments/${assignmentId}/plagiarism/${runId}/pairs?${params}`,
      { credentials: "include" }
    );
    return handleResponse<PlagiarismPair[]>(res);
  },
};
