// Shared by the reserve server action and its client form. Spring is the real validator; these checks only spare a round trip.

export type ReserveField = "partySize" | "contactName" | "contactPhone" | "contactEmail" | "agree";

export type ReserveValues = { partySize: number; contactName: string; contactPhone: string; contactEmail: string; agree: boolean };

export type ReserveState = {
  message?: string;
  fieldErrors?: Partial<Record<ReserveField, string>>;
  values?: ReserveValues;
  /** Replaces the rendered key once the server has definitively rejected a request, so an edited retry is not a key reuse. */
  idempotencyKey?: string;
};

export const PHONE = /^01[0-9]-?[0-9]{3,4}-?[0-9]{4}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/** Upper party-size bound is enforced by the counter and by Spring (PARTY_SIZE_EXCEEDED). */
export function validateReserve(values: ReserveValues) {
  const errors: Partial<Record<ReserveField, string>> = {};
  if (!Number.isInteger(values.partySize) || values.partySize < 1) errors.partySize = "예약 인원을 확인해 주세요.";
  if (values.contactName.length < 1 || values.contactName.length > 50) errors.contactName = "이름을 1자 이상 50자 이하로 입력해 주세요.";
  if (!PHONE.test(values.contactPhone)) errors.contactPhone = "휴대폰 번호를 010-1234-5678 형식으로 입력해 주세요.";
  if (!EMAIL.test(values.contactEmail) || values.contactEmail.length > 254) errors.contactEmail = "이메일 형식을 확인해 주세요.";
  if (!values.agree) errors.agree = "필수 약관에 동의해 주세요.";
  return errors;
}

const messages: Record<string, string> = {
  VALIDATION_FAILED: "입력한 예약 정보를 확인해 주세요.",
  PARTY_SIZE_EXCEEDED: "예약 가능한 최대 인원을 초과했습니다.",
  HEADER_REQUIRED: "요청 정보가 올바르지 않습니다. 페이지를 새로고침한 뒤 다시 시도해 주세요.",
  NOT_FOUND: "선택한 회차를 찾을 수 없습니다. 팝업 상세에서 회차를 다시 선택해 주세요.",
  RESERVATION_NOT_OPEN: "지금은 예약할 수 없는 팝업입니다. 예약 오픈 일정을 확인해 주세요.",
  SLOT_UNAVAILABLE: "이미 시작했거나 예약할 수 없는 회차입니다. 다른 회차를 선택해 주세요.",
  SOLD_OUT: "선택한 회차의 잔여석이 부족합니다. 다른 회차를 선택해 주세요.",
  DUPLICATE_RESERVATION: "이미 이 회차에 예약이 있습니다. 내 예약에서 확인해 주세요.",
  IDEMPOTENCY_KEY_REUSED: "이전 요청과 내용이 달라 처리하지 못했습니다. 다시 한 번 예약 확정을 눌러 주세요.",
  API_UNAVAILABLE: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

/** Korean message for a Spring error code; falls back to the API detail. */
export function reservationErrorMessage(code: string, detail?: string) {
  return messages[code] ?? detail ?? "예약을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}
