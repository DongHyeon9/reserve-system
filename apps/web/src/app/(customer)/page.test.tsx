import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "@/lib/api";
import Home from "./page";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (original) => ({ ...(await original<typeof import("@/lib/api")>()), apiFetch: (...args: unknown[]) => apiFetch(...args) }));
afterEach(cleanup);

test("home hero links to popup discovery and lists trending popups", async () => {
  apiFetch.mockResolvedValueOnce({
    items: [{ id: 7, title: "도심 속 작은 정원", label: "Tiny Garden", area: "성수", category: "라이프스타일", artTheme: "red", startsOn: "2026-10-18", endsOn: "2026-11-03", opensAt: "2026-10-01T00:00:00Z", reservationStatus: "OPEN", remainingSeats: 30 }],
    page: 0, size: 3, totalItems: 1, totalPages: 1,
  });
  render(await Home());
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("어디에 빠져볼까요?");
  expect(screen.getByRole("link", { name: "팝업 둘러보기" }).getAttribute("href")).toBe("/popups");
  expect(apiFetch).toHaveBeenCalledWith("/api/popups?page=0&size=3");
  expect(screen.getByRole("heading", { name: "도심 속 작은 정원" })).toBeDefined();
  expect(screen.getByRole("link", { name: "전체 보기 →" }).getAttribute("href")).toBe("/popups");
});

test("home still renders without the trending section when the API fails", async () => {
  apiFetch.mockRejectedValueOnce(new ApiError(503, "API_UNAVAILABLE", "down"));
  render(await Home());
  expect(screen.getByRole("heading", { level: 1 })).toBeDefined();
  expect(screen.queryByText("Trending now")).toBeNull();
});
