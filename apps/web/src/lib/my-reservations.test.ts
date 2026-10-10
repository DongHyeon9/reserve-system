import { expect, test } from "vitest";
import { bookingBadge, cancelErrorMessage, parseTab } from "./my-reservations";
import { kstBookingDate } from "./time";

test("tab query falls back to UPCOMING for missing or unknown values", () => {
  expect(parseTab("PAST")).toBe("PAST");
  expect(parseTab("CANCELLED")).toBe("CANCELLED");
  expect(parseTab(undefined)).toBe("UPCOMING");
  expect(parseTab("past")).toBe("UPCOMING");
  expect(parseTab(["PAST"])).toBe("UPCOMING");
});

test("status badges", () => {
  expect(bookingBadge("CONFIRMED")).toEqual({ label: "예약 확정", className: "badge badge-success" });
  expect(bookingBadge("CHECKED_IN")).toEqual({ label: "체크인", className: "badge badge-blue" });
  expect(bookingBadge("CANCELLED")).toEqual({ label: "취소", className: "badge badge-neutral" });
});

test("cancel error codes map to Korean, unknown codes keep the API detail", () => {
  expect(cancelErrorMessage("CANCEL_DEADLINE_PASSED")).toBe("무료 취소 가능 시간이 지났습니다.");
  expect(cancelErrorMessage("NOT_CANCELLABLE", "x")).toBe("이미 체크인된 예약은 취소할 수 없습니다.");
  expect(cancelErrorMessage("NOT_FOUND", "예약을 찾을 수 없습니다.")).toBe("예약을 찾을 수 없습니다.");
  expect(cancelErrorMessage("UNKNOWN")).toMatch(/취소하지 못했습니다/);
});

test("booking date block is the KST calendar day", () => {
  expect(kstBookingDate("2026-10-17T15:00:00Z")).toEqual({ month: "10월", day: "18", weekday: "일요일" });
});
