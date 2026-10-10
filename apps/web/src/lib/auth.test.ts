// @vitest-environment node
import { createHmac } from "node:crypto";
import { NextRequest } from "next/server";
import { expect, test } from "vitest";
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

test("proxy sends signed-out visitors to the matching login page with a return path", () => {
  const customer = proxy(new NextRequest("http://localhost/reservations/abc"));
  expect(customer.headers.get("location")).toBe("http://localhost/login?next=%2Freservations%2Fabc");
  const admin = proxy(new NextRequest("http://localhost/admin/popups"));
  expect(admin.headers.get("location")).toBe("http://localhost/admin/login?next=%2Fadmin%2Fpopups");
  expect(proxy(new NextRequest("http://localhost/admin/login")).headers.get("location")).toBeNull();
  const signedIn = new NextRequest("http://localhost/reservations", { headers: { cookie: "popspot_session=x" } });
  expect(signedIn && proxy(signedIn).headers.get("location")).toBeNull();
});
