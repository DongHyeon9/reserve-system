// Shared by the admin reservation pages, server actions and client components. Spring is the real validator.
import { adminErrorMessage } from "./admin-popups";
import { kstDateKey, kstTime, shortDate } from "./time";
import type { AdminReservation, BookingStatus, ReservationContact } from "./types";

export const BOOKING_STATUSES = [
  ["CONFIRMED", "예약 확정"],
  ["CHECKED_IN", "체크인"],
  ["CANCELLED", "취소"],
] as const;

const BADGE_CLASS: Record<BookingStatus, string> = { CONFIRMED: "badge-success", CHECKED_IN: "badge-blue", CANCELLED: "badge-neutral" };

export function bookingBadge(status: BookingStatus) {
  return { text: BOOKING_STATUSES.find(([s]) => s === status)![1], className: BADGE_CLASS[status] };
}

export const EVENT_LABELS: Record<AdminReservation["events"][number]["type"], string> = {
  CREATED: "예약 확정",
  CANCELLED: "예약 취소",
  CHECKED_IN: "체크인",
};
export const ACTOR_LABELS: Record<AdminReservation["events"][number]["actorRole"], string> = { CUSTOMER: "고객", ADMIN: "관리자" };

/** "10.18 15:00" in KST. */
export const kstShort = (iso: string) => `${shortDate(kstDateKey(iso))} ${kstTime(iso)}`;

const messages: Record<string, string> = {
  NOT_CANCELLABLE: "체크인된 예약은 취소할 수 없습니다.",
  CHECK_IN_NOT_TODAY: "체크인은 방문 당일에만 가능합니다.",
  NOT_CHECKINABLE: "취소된 예약은 체크인할 수 없습니다.",
  NOT_FOUND: "예약을 찾을 수 없습니다. 목록에서 다시 확인해 주세요.",
};

export function reservationErrorMessage(code: string, detail?: string) {
  return messages[code] ?? adminErrorMessage(code, detail);
}

export type ListFilters = { q: string; popupId: string; date: string; status: string };

/** Normalizes raw search params; anything malformed is dropped rather than sent to the API. */
export function listFilters(raw: Record<string, unknown>): ListFilters {
  const one = (v: unknown) => (typeof v === "string" ? v.trim() : "");
  const status = one(raw.status);
  return {
    q: one(raw.q).slice(0, 100),
    popupId: /^\d{1,18}$/.test(one(raw.popupId)) ? one(raw.popupId) : "",
    date: /^\d{4}-\d{2}-\d{2}$/.test(one(raw.date)) ? one(raw.date) : "",
    status: BOOKING_STATUSES.some(([s]) => s === status) ? status : "",
  };
}

/** Query string with only the set filters; page 0 is omitted so the first-page URL stays clean. */
export function listQuery(filters: ListFilters, page: number) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
  if (page > 0) params.set("page", String(page));
  return params.toString();
}

export type ActionState = {
  message?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  contact?: ReservationContact;
  attempt?: number;
};
