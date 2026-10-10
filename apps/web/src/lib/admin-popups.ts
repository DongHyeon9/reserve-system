// Shared by the admin popup/slot server actions and their client forms. Spring is the real validator.
import { isoToKstLocalInput, kstLocalInputToIso } from "./time";
import type { AdminPopup, AdminSlot, PublishStatus, ReservationStatus } from "./types";

export const PUBLISH_LABELS: Record<PublishStatus, string> = { DRAFT: "초안", PUBLISHED: "게시 중", ENDED: "게시 종료" };

export function publishBadge(status: PublishStatus) {
  return { text: PUBLISH_LABELS[status], className: status === "PUBLISHED" ? "badge-blue" : "badge-neutral" };
}

export function reservationBadge(status: ReservationStatus) {
  switch (status) {
    case "OPEN":
      return { text: "예약 가능", className: "badge-success" };
    case "WAITING":
      return { text: "오픈 대기", className: "badge-warning" };
    case "SOLD_OUT":
      return { text: "매진", className: "badge-neutral" };
    case "CLOSED":
      return { text: "예약 마감", className: "badge-neutral" };
  }
}

/** Same threshold as the dashboard alert: at most 20% of capacity left. */
export function slotBadge(slot: Pick<AdminSlot, "capacity" | "remaining">) {
  if (slot.remaining <= 0) return { text: "매진", className: "badge-neutral" };
  if (slot.remaining <= slot.capacity * 0.2) return { text: "마감 임박", className: "badge-warning" };
  return { text: "예약 가능", className: "badge-success" };
}

const messages: Record<string, string> = {
  VALIDATION_FAILED: "입력값을 확인해 주세요.",
  INVALID_PERIOD: "기간을 확인해 주세요. 끝나는 날짜·시간은 시작보다 늦어야 합니다.",
  SLOTS_OUTSIDE_PERIOD: "변경한 운영 기간 밖에 이미 회차가 있습니다. 회차를 먼저 정리해 주세요.",
  HAS_RESERVATIONS: "유효한 예약이 있어 초안으로 되돌릴 수 없습니다.",
  STALE_UPDATE: "다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.",
  POPUP_NOT_DELETABLE: "회차가 없는 초안 팝업만 삭제할 수 있습니다.",
  SLOT_OUTSIDE_PERIOD: "팝업 운영 기간 안의 날짜(KST)에만 회차를 만들 수 있습니다.",
  SLOT_EXISTS: "같은 시작 시간의 회차가 이미 있습니다.",
  CAPACITY_BELOW_RESERVED: "예약 인원보다 정원을 작게 변경할 수 없습니다.",
  SLOT_HAS_RESERVATIONS: "예약이 있는 회차는 삭제할 수 없습니다.",
  NOT_FOUND: "대상을 찾을 수 없습니다. 목록에서 다시 확인해 주세요.",
  API_UNAVAILABLE: "서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주세요.",
};

export function adminErrorMessage(code: string, detail?: string) {
  return messages[code] ?? detail ?? "요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주세요.";
}

/** Form state for useActionState. `attempt` remounts the form so uncontrolled inputs show `values` after React's post-action reset. */
export type FormState = {
  message?: string;
  success?: string;
  fieldErrors?: Record<string, string>;
  values?: Record<string, string>;
  attempt?: number;
};

export const POPUP_FIELDS = [
  "title", "label", "category", "area", "summary", "startsOn", "endsOn", "address", "operatingHours", "visitMinutes",
  "description", "notice", "maxPartySize", "cancelCutoffHours", "openMode", "opensAt", "closesAt", "publishStatus",
  "manuallyClosed", "artTheme",
] as const;

export type PopupValues = Record<(typeof POPUP_FIELDS)[number], string>;

export function popupToValues(p: AdminPopup | null): PopupValues {
  return {
    title: p?.title ?? "",
    label: p?.label ?? "",
    category: p?.category ?? "",
    area: p?.area ?? "",
    summary: p?.summary ?? "",
    startsOn: p?.startsOn ?? "",
    endsOn: p?.endsOn ?? "",
    address: p?.address ?? "",
    operatingHours: p?.operatingHours ?? "",
    visitMinutes: String(p?.visitMinutes ?? 40),
    description: p?.description ?? "",
    notice: p?.notice ?? "",
    maxPartySize: String(p?.maxPartySize ?? 4),
    cancelCutoffHours: String(p?.cancelCutoffHours ?? 24),
    openMode: p ? "scheduled" : "now",
    opensAt: p ? isoToKstLocalInput(p.opensAt) : "",
    closesAt: p?.closesAt ? isoToKstLocalInput(p.closesAt) : "",
    publishStatus: p?.publishStatus ?? "DRAFT",
    manuallyClosed: p?.manuallyClosed ? "on" : "",
    artTheme: p?.artTheme ?? "blue",
  };
}

const int = (v: string) => (v === "" ? null : Number(v));

/** Builds the PopupForm body; "즉시 오픈" uses the server's current time. Returns field errors for unparseable KST times. */
export function popupBody(v: PopupValues, nowIso: string) {
  const errors: Record<string, string> = {};
  const opensAt = v.openMode === "now" ? nowIso : kstLocalInputToIso(v.opensAt);
  if (!opensAt) errors.opensAt = "예약 오픈 일시를 입력해 주세요.";
  const closesAt = v.closesAt ? kstLocalInputToIso(v.closesAt) : null;
  if (v.closesAt && !closesAt) errors.closesAt = "예약 마감 일시를 확인해 주세요.";
  const body = {
    title: v.title,
    label: v.label,
    area: v.area,
    category: v.category,
    summary: v.summary,
    description: v.description,
    notice: v.notice || null,
    address: v.address,
    operatingHours: v.operatingHours,
    visitMinutes: int(v.visitMinutes),
    artTheme: v.artTheme,
    startsOn: v.startsOn,
    endsOn: v.endsOn,
    publishStatus: v.publishStatus,
    opensAt,
    closesAt,
    manuallyClosed: v.manuallyClosed === "on",
    maxPartySize: int(v.maxPartySize),
    cancelCutoffHours: int(v.cancelCutoffHours),
  };
  return { body, errors };
}
