import { API_BASE, handleResponse } from "./core";

export const userIntegrations = {
  githubConnectUrl(): string {
    return `${API_BASE}/api/v1/integrations/github/user/connect`;
  },

  async getGitHubStatus(): Promise<{
    connected: boolean;
    github_user_id: number | null;
    github_login: string | null;
    github_connected_at: string | null;
  }> {
    const res = await fetch(`${API_BASE}/api/v1/integrations/github/user/status`, {
      credentials: "include",
    });
    return handleResponse(res);
  },
};
