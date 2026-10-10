import { expect, test } from "vitest";
import { bookingBadge, kstShort, listFilters, listQuery, reservationErrorMessage } from "./admin-reservations";

test("status badges follow the design colors", () => {
  expect(bookingBadge("CONFIRMED")).toEqual({ text: "예약 확정", className: "badge-success" });
  expect(bookingBadge("CHECKED_IN")).toEqual({ text: "체크인", className: "badge-blue" });
  expect(bookingBadge("CANCELLED")).toEqual({ text: "취소", className: "badge-neutral" });
});

test("reservation error codes map to Korean messages, falling back to the admin map and detail", () => {
  expect(reservationErrorMessage("NOT_CANCELLABLE")).toBe("체크인된 예약은 취소할 수 없습니다.");
  expect(reservationErrorMessage("CHECK_IN_NOT_TODAY")).toBe("체크인은 방문 당일에만 가능합니다.");
  expect(reservationErrorMessage("NOT_CHECKINABLE")).toBe("취소된 예약은 체크인할 수 없습니다.");
  expect(reservationErrorMessage("VALIDATION_FAILED")).toBe("입력값을 확인해 주세요.");
  expect(reservationErrorMessage("NEW_CODE", "서버 설명")).toBe("서버 설명");
});

test("filters drop malformed values and the query omits empties and page 0", () => {
  const f = listFilters({ q: "  PS-26 ", popupId: "12x", date: "2026-10-18", status: "BOGUS", page: "2" });
  expect(f).toEqual({ q: "PS-26", popupId: "", date: "2026-10-18", status: "" });
  expect(listQuery(f, 0)).toBe("q=PS-26&date=2026-10-18");
  expect(listQuery({ ...f, popupId: "7", status: "CHECKED_IN" }, 3)).toBe("q=PS-26&popupId=7&date=2026-10-18&status=CHECKED_IN&page=3");
  expect(listFilters({ q: ["a", "b"] }).q).toBe("");
});

test("short KST time crosses the UTC date boundary", () => {
  expect(kstShort("2026-10-17T15:30:00Z")).toBe("10.18 00:30");
});
