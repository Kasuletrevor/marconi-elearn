import { API_BASE, handleResponse } from "./core";
import type { InvitePreview } from "./types";

export const invites = {
  async preview(token: string): Promise<InvitePreview> {
    const res = await fetch(
      `${API_BASE}/api/v1/invites/preview?token=${encodeURIComponent(token)}`,  
      { credentials: "include" }
    );
    return handleResponse<InvitePreview>(res);
  },
};
