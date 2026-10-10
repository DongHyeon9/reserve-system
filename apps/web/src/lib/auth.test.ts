// @vitest-environment node
import { createHmac } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { afterEach, expect, test, vi } from "vitest";
import { proxy } from "@/proxy";
import { devUserId, signDevJwt } from "./dev-auth";
import { safeNextPath } from "./session";

test("devUserId is a stable RFC 4122 shaped UUID, case-insensitive on email", () => {
  const id = devUserId("Hello@Example.com");
  expect(id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  expect(devUserId(" hello@example.com ")).toBe(id);
});

test("signDevJwt produces a Supabase-shaped HS256 token Spring can verify", () => {
  const secret = "s".repeat(32);
  const token = signDevJwt({ email: "a@example.com", secret, issuer: "popspot-dev", nowSeconds: 1000, ttlSeconds: 3600 });
  const [header, payload, signature] = token.split(".");
  expect(createHmac("sha256", secret).update(`${header}.${payload}`).digest("base64url")).toBe(signature);
  const claims = JSON.parse(Buffer.from(payload, "base64url").toString());
  expect(claims).toMatchObject({ sub: devUserId("a@example.com"), aud: "authenticated", iss: "popspot-dev", exp: 4600 });
});

test("safeNextPath only allows same-origin relative paths", () => {
  expect(safeNextPath("/popups/1/reserve?slot=3")).toBe("/popups/1/reserve?slot=3");
  expect(safeNextPath("//evil.example")).toBe("/");
  expect(safeNextPath("/\\evil.example")).toBe("/");
  expect(safeNextPath("https://evil.example")).toBe("/");
  expect(safeNextPath(null, "/admin")).toBe("/admin");
});

const supabase = vi.hoisted(() => ({ signedIn: false }));
vi.mock("@/lib/supabase/proxy", () => ({
  updateSession: async (request: NextRequest) => {
    const response = NextResponse.next({ request });
    response.cookies.set("sb-test-auth-token", "refreshed");
    return { response, signedIn: supabase.signedIn };
  },
}));

afterEach(() => {
  supabase.signedIn = false;
  vi.unstubAllEnvs();
});

const location = async (url: string, cookie?: string) =>
  (await proxy(new NextRequest(url, cookie ? { headers: { cookie } } : undefined))).headers.get("location");

test("proxy sends signed-out visitors on protected pages to the matching login page with a return path", async () => {
  expect(await location("http://localhost/reservations/abc")).toBe("http://localhost/login?next=%2Freservations%2Fabc");
  expect(await location("http://localhost/popups/7/reserve?slot=3")).toBe("http://localhost/login?next=%2Fpopups%2F7%2Freserve%3Fslot%3D3");
  expect(await location("http://localhost/admin/popups")).toBe("http://localhost/admin/login?next=%2Fadmin%2Fpopups");
  expect(await location("http://localhost/admin/login")).toBeNull();
  expect(await location("http://localhost/popups/7")).toBeNull();
  expect(await location("http://localhost/reservationsx")).toBeNull();
});

test("proxy keeps refreshed Supabase cookies on the redirect", async () => {
  const response = await proxy(new NextRequest("http://localhost/reservations"));
  expect(response.cookies.get("sb-test-auth-token")?.value).toBe("refreshed");
});

test("proxy lets Supabase users through, and dev cookies only when dev auth is enabled", async () => {
  supabase.signedIn = true;
  expect(await location("http://localhost/admin")).toBeNull();
  supabase.signedIn = false;

  expect(await location("http://localhost/reservations", "popspot_session=x")).not.toBeNull();
  vi.stubEnv("DEV_AUTH_ENABLED", "true");
  expect(await location("http://localhost/reservations", "popspot_session=x")).toBeNull();
});
