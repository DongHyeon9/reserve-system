import { expect, test } from "vitest";
import { adminErrorMessage, popupBody, popupToValues, slotBadge } from "./admin-popups";

test("error codes map to Korean messages with a detail fallback", () => {
  expect(adminErrorMessage("STALE_UPDATE")).toBe("다른 관리자가 먼저 수정했습니다. 새로고침 후 다시 시도해 주세요.");
  expect(adminErrorMessage("CAPACITY_BELOW_RESERVED")).toBe("예약 인원보다 정원을 작게 변경할 수 없습니다.");
  expect(adminErrorMessage("SLOT_EXISTS")).toContain("같은 시작 시간");
  expect(adminErrorMessage("SOMETHING_NEW", "서버 설명")).toBe("서버 설명");
  expect(adminErrorMessage("SOMETHING_NEW")).toContain("요청을 처리하지 못했습니다");
});

test("slot badge: sold out at 0, nearly full at ≤20% remaining, else available", () => {
  expect(slotBadge({ capacity: 20, remaining: 0 }).text).toBe("매진");
  expect(slotBadge({ capacity: 20, remaining: 4 }).text).toBe("마감 임박");
  expect(slotBadge({ capacity: 20, remaining: 5 }).text).toBe("예약 가능");
  expect(slotBadge({ capacity: 3, remaining: 1 }).text).toBe("예약 가능");
  expect(slotBadge({ capacity: 5, remaining: 1 }).text).toBe("마감 임박");
});

test("popup body: scheduled open converts KST to offset ISO; immediate open uses server now", () => {
  const values = { ...popupToValues(null), openMode: "scheduled", opensAt: "2026-10-20T14:00", closesAt: "", notice: "", visitMinutes: "40" };
  const scheduled = popupBody(values, "2026-10-10T00:00:00.000Z");
  expect(scheduled.errors).toEqual({});
  expect(scheduled.body).toMatchObject({ opensAt: "2026-10-20T14:00:00+09:00", closesAt: null, notice: null, visitMinutes: 40, manuallyClosed: false });
  expect(popupBody({ ...values, openMode: "now" }, "2026-10-10T00:00:00.000Z").body.opensAt).toBe("2026-10-10T00:00:00.000Z");
  expect(popupBody({ ...values, opensAt: "" }, "x").errors.opensAt).toBeTruthy();
});
