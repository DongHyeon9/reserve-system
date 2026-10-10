import type { BookingStatus, ReservationList } from "./types";

export type BookingTab = "UPCOMING" | "PAST" | "CANCELLED";

export const BOOKING_TABS: { tab: BookingTab; label: string; count: keyof ReservationList["counts"]; empty: string }[] = [
  { tab: "UPCOMING", label: "예정", count: "upcoming", empty: "예정된 예약이 없습니다" },
  { tab: "PAST", label: "지난 예약", count: "past", empty: "지난 예약이 없습니다" },
  { tab: "CANCELLED", label: "취소", count: "cancelled", empty: "취소한 예약이 없습니다" },
];

export function parseTab(value: unknown): BookingTab {
  return BOOKING_TABS.find((t) => t.tab === value)?.tab ?? "UPCOMING";
}

const BADGES: Record<BookingStatus, { label: string; className: string }> = {
  CONFIRMED: { label: "예약 확정", className: "badge badge-success" },
  CHECKED_IN: { label: "체크인", className: "badge badge-blue" },
  CANCELLED: { label: "취소", className: "badge badge-neutral" },
};

export const bookingBadge = (status: BookingStatus) => BADGES[status];

const CANCEL_MESSAGES: Record<string, string> = {
  CANCEL_DEADLINE_PASSED: "무료 취소 가능 시간이 지났습니다.",
  NOT_CANCELLABLE: "이미 체크인된 예약은 취소할 수 없습니다.",
};

export function cancelErrorMessage(code: string, detail?: string) {
  return CANCEL_MESSAGES[code] ?? detail ?? "예약을 취소하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
