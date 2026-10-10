import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "@/lib/api";

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock("@/lib/api", async (original) => ({ ...(await original<typeof import("@/lib/api")>()), apiFetch }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), usePathname: () => "/admin" }));
vi.mock("@/app/auth-actions", () => ({ logout: vi.fn() }));
afterEach(() => apiFetch.mockReset());

const { default: AdminConsoleLayout } = await import("./layout");

test("an unreachable API shows a recoverable notice instead of crashing", async () => {
  apiFetch.mockRejectedValue(new ApiError(503, "API_UNAVAILABLE", "x"));
  render(await AdminConsoleLayout({ children: <p>본문</p> }));
  expect(screen.getByRole("heading", { name: "서버에 연결할 수 없습니다" })).toBeDefined();
  expect(screen.queryByText("본문")).toBeNull();
});

test("forbidden keeps the permission message and never renders admin content", async () => {
  apiFetch.mockRejectedValue(new ApiError(403, "FORBIDDEN", "x"));
  render(await AdminConsoleLayout({ children: <p>본문</p> }));
  expect(screen.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeDefined();
  expect(screen.queryByText("본문")).toBeNull();
});
