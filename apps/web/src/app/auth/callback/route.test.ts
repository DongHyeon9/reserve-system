// @vitest-environment node
import { NextRequest } from "next/server";
import { beforeEach, expect, test, vi } from "vitest";
import { GET } from "./route";

const exchangeCodeForSession = vi.fn();
vi.mock("@/lib/supabase/server", () => ({ createClient: async () => ({ auth: { exchangeCodeForSession } }) }));
beforeEach(() => exchangeCodeForSession.mockReset().mockResolvedValue({ error: null }));

const location = async (query: string) => (await GET(new NextRequest(`http://localhost/auth/callback${query}`))).headers.get("location");

test("callback exchanges the code and returns to a safe next path", async () => {
  expect(await location("?code=abc&next=%2Freservations")).toBe("http://localhost/reservations");
  expect(exchangeCodeForSession).toHaveBeenCalledWith("abc");
});

test("callback never redirects off-site", async () => {
  expect(await location("?code=abc&next=%2F%2Fevil.example")).toBe("http://localhost/");
  expect(await location("?code=abc&next=https%3A%2F%2Fevil.example")).toBe("http://localhost/");
});

test("callback sends failures back to login", async () => {
  expect(await location("?next=%2Freservations")).toBe("http://localhost/login?error=callback&next=%2Freservations");
  expect(exchangeCodeForSession).not.toHaveBeenCalled();
  exchangeCodeForSession.mockResolvedValue({ error: new Error("expired") });
  expect(await location("?code=bad")).toBe("http://localhost/login?error=callback&next=%2F");
});
