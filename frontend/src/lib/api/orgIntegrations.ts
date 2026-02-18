import { API_BASE, handleResponse } from "./core";
import type { OrgGitHubStatus } from "./types";

export const orgIntegrations = {
  githubConnectUrl(orgId: number): string {
    return `${API_BASE}/api/v1/orgs/${orgId}/integrations/github/connect`;
  },

  async getGitHubStatus(orgId: number): Promise<OrgGitHubStatus> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/integrations/github/status`, {
      credentials: "include",
    });
    return handleResponse<OrgGitHubStatus>(res);
  },

  async disconnectGitHub(orgId: number): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}/integrations/github/disconnect`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },
};
