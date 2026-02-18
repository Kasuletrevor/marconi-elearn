import { API_BASE, handleResponse } from "./core";
import type { Organization, SuperadminStats } from "./types";

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
