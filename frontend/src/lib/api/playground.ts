import { API_BASE, handleResponse } from "./core";
import type { PlaygroundLanguage, PlaygroundRunRequest, PlaygroundRunResponse } from "./types";

export const playground = {
  async listLanguages(): Promise<PlaygroundLanguage[]> {
    const res = await fetch(`${API_BASE}/api/v1/playground/languages`, {
      credentials: "include",
    });
    return handleResponse<PlaygroundLanguage[]>(res);
  },

  async run(data: PlaygroundRunRequest): Promise<PlaygroundRunResponse> {
    const res = await fetch(`${API_BASE}/api/v1/playground/run`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(data),
    });
    return handleResponse<PlaygroundRunResponse>(res);
  },
};
