import { cookies } from "next/headers";
import { ApiError } from "@/lib/api";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export async function serverApiFetch<T>(
  path: string,
  init?: RequestInit
): Promise<T> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.toString();
  const headers = new Headers(init?.headers);

  if (sessionCookie) {
    headers.set("cookie", sessionCookie);
  }

  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers,
    cache: "no-store",
  });

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

  if (response.status === 204) {
    return undefined as T;
  }

  return response.json();
}
