import { cookies } from "next/headers";
import { devAuthEnabled } from "./dev-auth";
import { createClient } from "./supabase/server";

export const SESSION_COOKIE = "popspot_session";
export const SESSION_TTL_SECONDS = 60 * 60;

export async function getAccessToken() {
  if (devAuthEnabled()) {
    const devToken = (await cookies()).get(SESSION_COOKIE)?.value;
    if (devToken) return devToken;
  }
  // getSession() reads the cookie without re-validating it. That is safe here because the token is only
  // forwarded to Spring, which verifies the signature, issuer and expiry itself. The proxy already refreshed it.
  const { data } = await (await createClient()).auth.getSession();
  return data.session?.access_token;
}

export async function isSignedIn() {
  return Boolean(await getAccessToken());
}

/** Only same-origin relative paths are allowed as post-login destinations. */
export function safeNextPath(next: unknown, fallback = "/") {
  if (typeof next !== "string" || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) return fallback;
  return next;
}
