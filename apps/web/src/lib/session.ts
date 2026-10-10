import { cookies } from "next/headers";

export const SESSION_COOKIE = "popspot_session";
export const SESSION_TTL_SECONDS = 60 * 60;

export async function getAccessToken() {
  return (await cookies()).get(SESSION_COOKIE)?.value;
}

/** Only same-origin relative paths are allowed as post-login destinations. */
export function safeNextPath(next: unknown, fallback = "/") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
