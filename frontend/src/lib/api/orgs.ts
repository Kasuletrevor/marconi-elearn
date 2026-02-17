import { API_BASE, handleResponse } from "./core";
import type { Organization, OrganizationCreate, OrganizationUpdate } from "./types";

export const orgs = {
  async list(offset = 0, limit = 100): Promise<Organization[]> {
    const res = await fetch(`${API_BASE}/api/v1/orgs?offset=${offset}&limit=${limit}`, {
      credentials: "include",
    });
    return handleResponse<Organization[]>(res);
  },

  async get(orgId: number): Promise<Organization> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}`, {
      credentials: "include",
    });
    return handleResponse<Organization>(res);
  },

  async create(data: OrganizationCreate): Promise<Organization> {
    const res = await fetch(`${API_BASE}/api/v1/orgs`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Organization>(res);
  },

  async update(orgId: number, data: OrganizationUpdate): Promise<Organization> {
    const res = await fetch(`${API_BASE}/api/v1/orgs/${orgId}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<Organization>(res);
  },
};
