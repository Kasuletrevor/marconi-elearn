import { API_BASE, handleResponse } from "./core";
import type { UserPublic } from "./types";

export const orgUsers = {
  async lookup(orgId: number, email: string): Promise<UserPublic> {
    const res = await fetch(
      `${API_BASE}/api/v1/orgs/${orgId}/users/lookup?email=${encodeURIComponent(email)}`,
      { credentials: "include" }
    );
    return handleResponse<UserPublic>(res);
  },
};
