// @vitest-environment node
import { afterEach, expect, test, vi } from "vitest";
import { apiFetch, ApiError } from "./api";

vi.mock("./session", () => ({ getAccessToken: async () => "secret-token" }));
afterEach(() => vi.restoreAllMocks());

test("sends a request id with the bearer token and logs only route, status, code and id on 5xx", async () => {
  const fetchMock = vi.spyOn(globalThis, "fetch").mockResolvedValue(
    new Response(JSON.stringify({ status: 500, code: "INTERNAL_ERROR", detail: "x" }), { status: 500 }),
  );
  const errorLog = vi.spyOn(console, "error").mockImplementation(() => {});
  await expect(apiFetch("/api/admin/reservations?q=김팝업")).rejects.toBeInstanceOf(ApiError);

  const headers = fetchMock.mock.calls[0][1]!.headers as Headers;
  expect(headers.get("X-Request-Id")).toMatch(/^[0-9a-f-]{36}$/);
  const logged = JSON.stringify(errorLog.mock.calls);
  expect(logged).toContain("/api/admin/reservations");
  expect(logged).toContain(headers.get("X-Request-Id"));
  expect(logged).not.toContain("김팝업");
  expect(logged).not.toContain("secret-token");
});
