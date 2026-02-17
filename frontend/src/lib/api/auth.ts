import { API_BASE, handleResponse } from "./core";
import type { AcceptInviteRequest, LoginRequest, User } from "./types";

export const auth = {
  async login(data: LoginRequest): Promise<User> {
    const res = await fetch(`${API_BASE}/api/v1/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },

  async logout(): Promise<void> {
    const res = await fetch(`${API_BASE}/api/v1/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
    return handleResponse<void>(res);
  },

  async me(): Promise<User> {
    const res = await fetch(`${API_BASE}/api/v1/auth/me`, {
      credentials: "include",
    });
    return handleResponse<User>(res);
  },

  async acceptInvite(data: AcceptInviteRequest): Promise<User> {
    const res = await fetch(`${API_BASE}/api/v1/auth/invite/accept`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<User>(res);
  },
};
