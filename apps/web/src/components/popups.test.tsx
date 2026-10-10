import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { PopupDetail, PopupSummary, Slot } from "@/lib/types";
import { PopupCard } from "./PopupCard";
import { PopupDetailView } from "./PopupDetailView";
import { RefreshAtServerTime } from "./RefreshAtServerTime";
import { SlotPicker } from "./SlotPicker";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => {
  cleanup();
  refresh.mockReset();
  vi.useRealTimers();
});

const summary: PopupSummary = {
  id: 7, title: "루프 랩", label: "Loop Lab", area: "성수", category: "테크", artTheme: "orange",
  startsOn: "2026-11-01", endsOn: "2026-11-17", opensAt: "2026-10-20T05:00:00Z", reservationStatus: "OPEN", remainingSeats: 30,
};

test.each([
  ["OPEN", 30, "예약 가능", "badge-success", "잔여 30석"],
  ["OPEN", 6, "마감 임박", "badge-warning", "잔여 6석"],
  ["WAITING", 30, "오픈 대기", "badge-warning", "10.20 14:00 KST 오픈"],
  ["SOLD_OUT", 0, "매진", "badge-neutral", "잔여 0석"],
  ["CLOSED", 0, "예약 마감", "badge-neutral", "운영 종료"],
] as const)("card for %s with %i seats shows %s", (reservationStatus, remainingSeats, badge, badgeClass, footer) => {
  render(<PopupCard popup={{ ...summary, reservationStatus, remainingSeats }} />);
  expect(screen.getByText(badge).className).toContain(badgeClass);
  expect(screen.getByText(footer)).toBeDefined();
  const link = screen.getByRole("link");
  expect(link.getAttribute("href")).toBe("/popups/7");
  expect(link.textContent).toBe(reservationStatus === "WAITING" ? "오픈 일정 보기 →" : "상세 보기 →");
});

// 2026-10-18 and 2026-10-19 in KST (UTC+9).
const slots: Slot[] = [
  { id: 1, startsAt: "2026-10-18T02:00:00Z", endsAt: "2026-10-18T03:00:00Z", capacity: 10, remaining: 0, reservable: false },
  { id: 2, startsAt: "2026-10-18T06:00:00Z", endsAt: "2026-10-18T07:00:00Z", capacity: 10, remaining: 6, reservable: true },
  { id: 3, startsAt: "2026-10-19T04:00:00Z", endsAt: "2026-10-19T05:00:00Z", capacity: 10, remaining: 3, reservable: true },
];

test("slot picker preselects the first reservable slot and switches dates", () => {
  render(<SlotPicker popupId={7} slots={slots} />);
  expect(screen.getByText("잔여 9석")).toBeDefined();
  expect(screen.getByText("2026년 10월 18일 일요일 · KST")).toBeDefined();
  const soldOut = screen.getByRole("button", { name: /11:00/ });
  expect(soldOut.hasAttribute("disabled")).toBe(true);
  expect(soldOut.textContent).toContain("매진");
  expect(screen.getByRole("link", { name: "15:00 예약하기" }).getAttribute("href")).toBe("/popups/7/reserve?slotId=2");

  fireEvent.click(screen.getByRole("button", { name: "2026년 10월 19일 월요일" }));
  expect(screen.getByRole("button", { name: "2026년 10월 19일 월요일" }).getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText("2026년 10월 19일 월요일 · KST")).toBeDefined();
  expect(screen.getByRole("link", { name: "13:00 예약하기" }).getAttribute("href")).toBe("/popups/7/reserve?slotId=3");
});

test("slot picker shows a disabled CTA when nothing is reservable", () => {
  render(<SlotPicker popupId={7} slots={[slots[0]]} />);
  expect(screen.getByRole("button", { name: "회차를 선택하세요" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("link")).toBeNull();
});

test("refreshes once the server-computed delay elapses", () => {
  vi.useFakeTimers();
  render(<RefreshAtServerTime msUntil={10_000} />);
  act(() => vi.advanceTimersByTime(10_499));
  expect(refresh).not.toHaveBeenCalled();
  act(() => vi.advanceTimersByTime(1));
  expect(refresh).toHaveBeenCalledOnce();
});

test("does not schedule beyond the setTimeout limit", () => {
  vi.useFakeTimers();
  render(<RefreshAtServerTime msUntil={30 * 86_400_000} />);
  expect(vi.getTimerCount()).toBe(0);
});

const detail: PopupDetail = {
  ...summary, summary: "인터랙티브 미디어 전시", description: "소개", notice: "플래시 금지", address: "서울 성동구",
  operatingHours: "매일 12:00 — 21:00", visitMinutes: 60, maxPartySize: 4, cancelCutoffHours: 24, closesAt: null,
  serverTime: "2026-10-10T03:00:00Z", slots,
};

test("waiting popup shows the open schedule and no slot CTA", () => {
  render(<PopupDetailView popup={{ ...detail, reservationStatus: "WAITING" }} />);
  expect(screen.getByText("2026년 10월 20일 화요일 14:00 (KST)")).toBeDefined();
  expect(screen.getByText("D-10")).toBeDefined();
  expect(screen.getByRole("button", { name: "10월 20일 14:00 오픈" }).hasAttribute("disabled")).toBe(true);
  expect(screen.queryByRole("link", { name: /예약하기/ })).toBeNull();
  expect(screen.getByText("방문 24시간 전까지 무료로 취소할 수 있습니다.", { exact: false })).toBeDefined();
});

test("open popup shows the slot picker; closed popup shows no CTA", () => {
  const { rerender } = render(<PopupDetailView popup={detail} />);
  expect(screen.getByRole("link", { name: "15:00 예약하기" })).toBeDefined();
  expect(screen.getByText("매일 12:00 — 21:00 (KST)")).toBeDefined();
  rerender(<PopupDetailView popup={{ ...detail, reservationStatus: "CLOSED" }} />);
  expect(screen.getByText("예약이 마감되었습니다.")).toBeDefined();
  expect(screen.queryByRole("link", { name: /예약하기/ })).toBeNull();
});
