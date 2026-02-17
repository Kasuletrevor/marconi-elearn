import { API_BASE, handleResponse } from "./core";

export interface HealthResponse {
  status: string;
}

export const health = {
  async get(): Promise<HealthResponse> {
    const res = await fetch(`${API_BASE}/api/v1/health`, {
      credentials: "include",
    });
    return handleResponse<HealthResponse>(res);
  },
};
