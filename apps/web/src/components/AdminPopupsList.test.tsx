import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { AdminPopupRow, PageResponse } from "@/lib/types";
import { AdminPopupsList } from "./AdminPopupsList";

afterEach(cleanup);

const hrefFor = (p: number) => `/admin/popups?q=a${p > 0 ? `&page=${p}` : ""}`;
const row: AdminPopupRow = {
  id: 3, title: "루프 랩", area: "성수", category: "테크", startsOn: "2026-11-01", endsOn: "2026-11-17",
  publishStatus: "PUBLISHED", reservationStatus: "WAITING", opensAt: "2026-10-20T05:00:00Z",
  slotCount: 12, activeReservations: 0, updatedAt: "2026-10-10T05:20:00Z",
};

test("a page beyond the last shows an empty state linking to page 1", () => {
  render(<AdminPopupsList result={{ items: [], page: 5, size: 20, totalItems: 3, totalPages: 1 }} page={5} filtered hrefFor={hrefFor} />);
  expect(screen.getByText("요청한 페이지에 팝업이 없습니다.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "첫 페이지로" }).getAttribute("href")).toBe("/admin/popups?q=a");
});

test("rows show both badges, KST auto-open time and pagination", () => {
  const result: PageResponse<AdminPopupRow> = { items: [row], page: 1, size: 20, totalItems: 41, totalPages: 3 };
  render(<AdminPopupsList result={result} page={1} filtered={false} hrefFor={hrefFor} />);
  expect(screen.getByText("게시 중")).toBeTruthy();
  expect(screen.getByText("오픈 대기")).toBeTruthy();
  expect(screen.getByText("10.20 14:00 KST 자동 오픈")).toBeTruthy();
  expect(screen.getByText("10.10 14:20")).toBeTruthy();
  expect(screen.getByRole("link", { name: "루프 랩 회차" }).getAttribute("href")).toBe("/admin/popups/3/slots");
  expect(screen.getByRole("link", { name: "← 이전" }).getAttribute("href")).toBe("/admin/popups?q=a");
  expect(screen.getByRole("link", { name: "다음 →" }).getAttribute("href")).toBe("/admin/popups?q=a&page=2");
});
