import { getAccessToken } from "./session";

export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
    message: string,
    readonly fieldErrors: { field: string; message: string }[] = [],
  ) {
    super(message);
  }
}

const baseUrl = () => process.env.API_BASE_URL ?? "http://localhost:8080";

/** Server-side call to the Spring API. The bearer token comes from the httpOnly session cookie and never reaches the browser. */
export async function apiFetch<T>(path: string, init: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  const headers = new Headers(init.headers);
  headers.set("Accept", "application/json");
  if (init.body) headers.set("Content-Type", "application/json");
  if (token) headers.set("Authorization", `Bearer ${token}`);

  let response: Response;
  try {
    response = await fetch(`${baseUrl()}${path}`, { ...init, headers, cache: "no-store" });
  } catch {
    throw new ApiError(503, "API_UNAVAILABLE", "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.");
  }
  if (!response.ok) {
    const problem = await response.json().catch(() => ({}));
    throw new ApiError(response.status, problem.code ?? "UNKNOWN", problem.detail ?? "요청을 처리하지 못했습니다.", problem.errors ?? []);
  }
  return response.status === 204 ? (undefined as T) : ((await response.json()) as T);
}
