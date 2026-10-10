import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { AdminReservationRow } from "@/lib/types";
import { AdminReservationsList } from "./AdminReservationsList";

afterEach(cleanup);

const hrefFor = (p: number) => `/admin/reservations?q=kim${p > 0 ? `&page=${p}` : ""}`;
const row: AdminReservationRow = {
  id: "r-1", code: "PS-261018-0427", status: "CHECKED_IN", popupId: 3, popupTitle: "도심 속 작은 정원",
  slotStartsAt: "2026-10-18T06:00:00Z", partySize: 2, contactName: "김팝업", contactPhoneMasked: "010-12**-56**",
  createdAt: "2026-10-10T05:27:00Z",
};

test("rows show masked phone, KST visit time, party size, status badge and detail link", () => {
  render(<AdminReservationsList result={{ items: [row], page: 1, size: 20, totalItems: 41, totalPages: 3 }} page={1} filtered hrefFor={hrefFor} />);
  expect(screen.getByText("예약 41건")).toBeTruthy();
  expect(screen.getByText("010-12**-56**")).toBeTruthy();
  expect(screen.getByText("10.18 15:00")).toBeTruthy();
  expect(screen.getByText("2명")).toBeTruthy();
  expect(screen.getByText("체크인").className).toBe("badge badge-blue");
  expect(screen.getByRole("link", { name: "PS-261018-0427 상세 보기" }).getAttribute("href")).toBe("/admin/reservations/r-1");
  expect(screen.getByRole("link", { name: "← 이전" }).getAttribute("href")).toBe("/admin/reservations?q=kim");
  expect(screen.getByRole("link", { name: "다음 →" }).getAttribute("href")).toBe("/admin/reservations?q=kim&page=2");
});

test("a page beyond the last shows an empty state linking to page 1", () => {
  render(<AdminReservationsList result={{ items: [], page: 9, size: 20, totalItems: 3, totalPages: 1 }} page={9} filtered hrefFor={hrefFor} />);
  expect(screen.getByText("요청한 페이지에 예약이 없습니다.")).toBeTruthy();
  expect(screen.getByRole("link", { name: "첫 페이지로" }).getAttribute("href")).toBe("/admin/reservations?q=kim");
});

test("empty results distinguish filtered from no data", () => {
  const empty = { items: [], page: 0, size: 20, totalItems: 0, totalPages: 0 };
  render(<AdminReservationsList result={empty} page={0} filtered hrefFor={hrefFor} />);
  expect(screen.getByRole("link", { name: "조건 초기화" }).getAttribute("href")).toBe("/admin/reservations");
  cleanup();
  render(<AdminReservationsList result={empty} page={0} filtered={false} hrefFor={hrefFor} />);
  expect(screen.getByText("아직 예약이 없습니다.")).toBeTruthy();
});
