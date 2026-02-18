import { API_BASE, handleResponse } from "./core";
import type { AuditEvent } from "./types";

export const audit = {
  async listOrgEvents(orgId: number, offset = 0, limit = 100): Promise<AuditEvent[]> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/audit?offset=${offset}&limit=${limit}`,
      { credentials: "include" }
    );
    return handleResponse<AuditEvent[]>(res);
  },
};
