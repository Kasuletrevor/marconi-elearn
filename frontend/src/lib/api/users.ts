import { API_BASE, handleResponse } from "./core";
import type { UserPublic } from "./types";

export const users = {
  async get(userId: number): Promise<UserPublic> {
    const res = await fetch(`${API_BASE}/api/v1/users/${userId}`, { credentials: "include" });
    return handleResponse<UserPublic>(res);
  },
};
