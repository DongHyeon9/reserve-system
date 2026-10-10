// TEMP: local stand-in for Supabase Auth until the project credentials exist (see todo/01-supabase.md).
// Mints HS256 tokens shaped like Supabase user tokens so Spring verifies them the same way.
import { createHash, createHmac } from "node:crypto";

const base64url = (input: string | Buffer) => Buffer.from(input).toString("base64url");

/** Stable UUID per email so the same dev user keeps their reservations across logins. */
export function devUserId(email: string): string {
  const hex = createHash("sha256").update(email.trim().toLowerCase()).digest("hex");
  const variant = ((parseInt(hex[16], 16) & 0x3) | 0x8).toString(16);
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${variant}${hex.slice(17, 20)}-${hex.slice(20, 32)}`;
}

export function signDevJwt(opts: { email: string; name?: string; secret: string; issuer: string; nowSeconds: number; ttlSeconds: number }) {
  const header = base64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const payload = base64url(
    JSON.stringify({
      sub: devUserId(opts.email),
      email: opts.email.trim().toLowerCase(),
      user_metadata: { name: opts.name ?? "" },
      aud: "authenticated",
      role: "authenticated",
      iss: opts.issuer,
      iat: opts.nowSeconds,
      exp: opts.nowSeconds + opts.ttlSeconds,
    }),
  );
  const signature = createHmac("sha256", opts.secret).update(`${header}.${payload}`).digest("base64url");
  return `${header}.${payload}.${signature}`;
}

export function devAuthEnabled() {
  return process.env.DEV_AUTH_ENABLED === "true" && process.env.VERCEL_ENV !== "production";
}
