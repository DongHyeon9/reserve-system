"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { devAuthEnabled, signDevJwt } from "@/lib/dev-auth";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, safeNextPath } from "@/lib/session";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

// TEMP: dev login. Replace with Supabase signInWithPassword + @supabase/ssr session once todo/01-supabase.md is done.
export async function login(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const loginPath = String(formData.get("loginPath")) === "/admin/login" ? "/admin/login" : "/login";
  const email = String(formData.get("email") ?? "").trim();
  const back = (error: string) => redirect(`${loginPath}?error=${error}&next=${encodeURIComponent(next)}`);

  const secret = process.env.DEV_AUTH_JWT_SECRET;
  if (!devAuthEnabled() || !secret || secret.length < 32) back("unavailable");
  if (!EMAIL.test(email) || email.length > 254) back("invalid");

  const token = signDevJwt({
    email,
    name: String(formData.get("name") ?? "").slice(0, 50),
    secret: secret!,
    issuer: process.env.DEV_AUTH_ISSUER ?? "popspot-dev",
    nowSeconds: Math.floor(Date.now() / 1000),
    ttlSeconds: SESSION_TTL_SECONDS,
  });
  (await cookies()).set(SESSION_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(next);
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}
