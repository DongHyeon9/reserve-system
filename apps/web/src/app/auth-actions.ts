"use server";

import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { devAuthEnabled, signDevJwt } from "@/lib/dev-auth";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, safeNextPath } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const MIN_PASSWORD = 8;

function fields(formData: FormData) {
  const next = safeNextPath(formData.get("next"));
  const loginPath = String(formData.get("loginPath")) === "/admin/login" ? "/admin/login" : "/login";
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  const back = (error: string, mode = "login"): never =>
    redirect(`${loginPath}?error=${error}&next=${encodeURIComponent(next)}${mode === "signup" ? "&mode=signup" : ""}`);
  return { next, email, password, back, validEmail: EMAIL.test(email) && email.length <= 254 };
}

export async function login(formData: FormData) {
  if (devAuthEnabled()) return devLogin(formData);
  const { next, email, password, back, validEmail } = fields(formData);
  if (!validEmail || !password) back("invalid");

  const { error } = await (await createClient()).auth.signInWithPassword({ email, password });
  if (error) back(error.code === "invalid_credentials" ? "invalid" : error.code === "email_not_confirmed" ? "unconfirmed" : "unavailable");
  redirect(next);
}

export async function signup(formData: FormData) {
  const { next, email, password, back, validEmail } = fields(formData);
  const name = String(formData.get("name") ?? "").trim().slice(0, 50);
  if (!validEmail || !name) back("invalid", "signup");
  if (password.length < MIN_PASSWORD) back("weak-password", "signup");

  const { data, error } = await (await createClient()).auth.signUp({
    email,
    password,
    options: { emailRedirectTo: `${await origin()}/auth/callback?next=${encodeURIComponent(next)}`, data: { name } },
  });
  if (error) back(error.code === "weak_password" ? "weak-password" : "unavailable", "signup");
  if (data.session) redirect(next);
  redirect(`/login?notice=check-email&next=${encodeURIComponent(next)}`);
}

export async function logout() {
  await (await createClient()).auth.signOut();
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/");
}

async function origin() {
  const h = await headers();
  const host = h.get("host");
  if (host) return `${h.get("x-forwarded-proto") ?? "http"}://${host}`;
  return process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000";
}

// Local E2E only (DEV_AUTH_ENABLED=true): passwordless login that mints an HS256 token Spring's dev fallback accepts.
async function devLogin(formData: FormData) {
  const { next, email, back, validEmail } = fields(formData);
  const secret = process.env.DEV_AUTH_JWT_SECRET;
  if (!secret || secret.length < 32) back("unavailable");
  if (!validEmail) back("invalid");

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
