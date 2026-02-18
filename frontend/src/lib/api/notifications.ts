import { API_BASE, handleResponse } from "./core";
import type { Notification } from "./types";

export const notifications = {
  async list(params?: {
    unread_only?: boolean;
    offset?: number;
    limit?: number;
  }): Promise<Notification[]> {
    const query = new URLSearchParams();
    if (params?.unread_only) query.set("unread_only", "true");
    if (params?.offset !== undefined) query.set("offset", String(params.offset));
    if (params?.limit !== undefined) query.set("limit", String(params.limit));

    const qs = query.toString();
    const res = await fetch(`${API_BASE}/api/v1/student/notifications${qs ? `?${qs}` : ""}`, {
      credentials: "include",
    });
    return handleResponse<Notification[]>(res);
  },

  async markRead(notificationId: number): Promise<Notification> {
    const res = await fetch(
      `${API_BASE}/api/v1/student/notifications/${notificationId}/read`,
      {
        method: "POST",
        credentials: "include",
      }
    );
    return handleResponse<Notification>(res);
  },
};
