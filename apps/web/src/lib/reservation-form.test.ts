import { expect, test } from "vitest";
import { reservationErrorMessage, validateReserve } from "./reservation-form";

test.each([
  ["SOLD_OUT", "선택한 회차의 잔여석이 부족합니다. 다른 회차를 선택해 주세요."],
  ["DUPLICATE_RESERVATION", "이미 이 회차에 예약이 있습니다. 내 예약에서 확인해 주세요."],
  ["RESERVATION_NOT_OPEN", "지금은 예약할 수 없는 팝업입니다. 예약 오픈 일정을 확인해 주세요."],
  ["SLOT_UNAVAILABLE", "이미 시작했거나 예약할 수 없는 회차입니다. 다른 회차를 선택해 주세요."],
  ["PARTY_SIZE_EXCEEDED", "예약 가능한 최대 인원을 초과했습니다."],
  ["IDEMPOTENCY_KEY_REUSED", "이전 요청과 내용이 달라 처리하지 못했습니다. 다시 한 번 예약 확정을 눌러 주세요."],
  ["VALIDATION_FAILED", "입력한 예약 정보를 확인해 주세요."],
  ["HEADER_REQUIRED", "요청 정보가 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요."],
  ["NOT_FOUND", "선택한 회차를 찾을 수 없습니다. 팝업 상세에서 회차를 다시 선택해 주세요."],
  ["API_UNAVAILABLE", "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요."],
])("%s maps to a Korean message", (code, message) => {
  expect(reservationErrorMessage(code, "detail")).toBe(message);
});

test("unknown codes fall back to the API detail, then a generic message", () => {
  expect(reservationErrorMessage("SOMETHING_NEW", "서버 상세")).toBe("서버 상세");
  expect(reservationErrorMessage("SOMETHING_NEW")).toBe("예약을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.");
});

const valid = { partySize: 1, contactName: "김팝업", contactPhone: "010-1234-5678", contactEmail: "a@b.co", agree: true };

test("validation accepts valid input and boundary phone formats", () => {
  expect(validateReserve(valid)).toEqual({});
  expect(validateReserve({ ...valid, contactPhone: "0111234567", contactName: "가".repeat(50) })).toEqual({});
});

test("validation rejects each bad field", () => {
  expect(
    Object.keys(validateReserve({ partySize: 0, contactName: "", contactPhone: "02-123-4567", contactEmail: "nope", agree: false })),
  ).toEqual(["partySize", "contactName", "contactPhone", "contactEmail", "agree"]);
  expect(validateReserve({ ...valid, contactName: "가".repeat(51) }).contactName).toBeDefined();
  expect(validateReserve({ ...valid, partySize: 1.5 }).partySize).toBeDefined();
});
