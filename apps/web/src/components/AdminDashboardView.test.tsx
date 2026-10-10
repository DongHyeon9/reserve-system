import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test } from "vitest";
import type { AdminDashboard } from "@/lib/types";
import { AlertsCard, KpiGrid, TodaySlotsCard } from "./AdminDashboardView";

afterEach(cleanup);

const kpis: AdminDashboard["kpis"] = {
  todayReservations: 128, yesterdayReservations: 114, reservationDeltaPercent: 12.3,
  todayVisits: 84, expectedVisits: 128, checkInRatePercent: 65.6,
  todaySlots: 18, soldOutSlots: 4,
  todayCancellations: 7, cancelRatePercent: 5.5,
};

test("KPI cards show deltas and rates", () => {
  render(<KpiGrid kpis={kpis} />);
  for (const text of ["↑ 어제보다 12.3%", "체크인율 65.6%", "매진 4회차", "취소율 5.5%", "128", "84", "18", "7"]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
});

test("KPI cards handle negative delta and null rates", () => {
  const { rerender } = render(<KpiGrid kpis={{ ...kpis, reservationDeltaPercent: -8.5 }} />);
  expect(screen.getByText("↓ 어제보다 8.5%")).toBeTruthy();
  rerender(<KpiGrid kpis={{ ...kpis, reservationDeltaPercent: null, checkInRatePercent: null, cancelRatePercent: null }} />);
  expect(screen.getByText("어제 예약 없음")).toBeTruthy();
  expect(screen.getByText("예정 방문 없음")).toBeTruthy();
  expect(screen.getByText("-")).toBeTruthy();
});

test("slot rows expose progressbar values and KST time", () => {
  render(<TodaySlotsCard slots={[{ slotId: 1, popupId: 2, popupTitle: "도심 속 작은 정원", startsAt: "2026-10-10T06:00:00Z", capacity: 20, reserved: 17 }]} />);
  const bar = screen.getByRole("progressbar", { name: "도심 속 작은 정원 15:00 회차 예약 현황" });
  expect(bar.getAttribute("aria-valuenow")).toBe("17");
  expect(bar.getAttribute("aria-valuemin")).toBe("0");
  expect(bar.getAttribute("aria-valuemax")).toBe("20");
  expect((bar.firstChild as HTMLElement).style.width).toBe("85%");
  expect(screen.getByText("17/20")).toBeTruthy();
});

test("alerts map to badges and KST text", () => {
  render(
    <AlertsCard
      alerts={[
        { type: "SLOT_NEARLY_FULL", popupId: 1, popupTitle: "정원", slotId: 3, at: "2026-10-10T06:00:00Z", remaining: 6 },
        { type: "OPENING_SOON", popupId: 2, popupTitle: "Loop Lab", slotId: null, at: "2026-10-20T05:00:00Z", remaining: null },
      ]}
    />,
  );
  expect(screen.getByText("마감 임박").className).toContain("badge-warning");
  expect(screen.getByText("정원 15:00 회차 잔여 6석")).toBeTruthy();
  expect(screen.getByText("오픈 예정").className).toContain("badge-blue");
  expect(screen.getByText("Loop Lab · 10월 20일 14:00 KST")).toBeTruthy();
});

test("empty states", () => {
  render(<><TodaySlotsCard slots={[]} /><AlertsCard alerts={[]} /></>);
  expect(screen.getByText("오늘 운영 회차가 없습니다.")).toBeTruthy();
  expect(screen.getByText("확인할 알림이 없습니다.")).toBeTruthy();
});
