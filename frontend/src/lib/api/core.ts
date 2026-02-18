/**
 * Shared API client core utilities
 */

export const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export class ApiError extends Error {
  constructor(
    public status: number,
    public detail: string
  ) {
    super(detail);
    this.name = "ApiError";
  }
}

export async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    let detail = "An error occurred";
    try {
      const data = await response.json();
      detail = data.detail || detail;
    } catch {
      // ignore parse errors
    }
    throw new ApiError(response.status, detail);
  }

  // Handle 204 No Content
  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
