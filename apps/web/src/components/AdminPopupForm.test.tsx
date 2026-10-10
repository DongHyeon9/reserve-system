import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { adminErrorMessage, popupToValues, type FormState } from "@/lib/admin-popups";
import { AdminPopupForm } from "./AdminPopupForm";

afterEach(cleanup);

test("toggling the open mode shows the KST datetime field only when scheduled", () => {
  render(<AdminPopupForm action={vi.fn()} initial={popupToValues(null)} />);
  expect(screen.queryByLabelText("예약 오픈 일시 · 한국 시간(KST)")).toBeNull();
  fireEvent.click(screen.getByLabelText("날짜·시간 지정"));
  expect(screen.getByLabelText("예약 오픈 일시 · 한국 시간(KST)")).toBeTruthy();
  fireEvent.click(screen.getByLabelText("즉시 오픈"));
  expect(screen.queryByLabelText("예약 오픈 일시 · 한국 시간(KST)")).toBeNull();
});

test("a failed save keeps every input and shows the mapped error", async () => {
  const action = vi.fn(async (prev: FormState, formData: FormData): Promise<FormState> => ({
    values: Object.fromEntries([...formData.entries()].map(([k, v]) => [k, String(v)])),
    fieldErrors: { label: "영문으로 입력해 주세요." },
    message: adminErrorMessage("STALE_UPDATE"),
    attempt: (prev.attempt ?? 0) + 1,
  }));
  render(<AdminPopupForm action={action} initial={popupToValues(null)} popupId={7} expectedUpdatedAt="2026-10-10T00:00:00Z" />);
  fireEvent.change(screen.getByLabelText("팝업 이름"), { target: { value: "테스트 팝업" } });
  fireEvent.click(screen.getByLabelText("날짜·시간 지정"));
  fireEvent.change(screen.getByLabelText("예약 오픈 일시 · 한국 시간(KST)"), { target: { value: "2026-10-20T14:00" } });
  fireEvent.change(screen.getByLabelText("상태"), { target: { value: "PUBLISHED" } });
  fireEvent.submit(screen.getByLabelText("팝업 이름").closest("form")!);

  expect((await screen.findByRole("alert")).textContent).toContain("다른 관리자가 먼저 수정했습니다");
  expect(action.mock.calls[0][1].get("expectedUpdatedAt")).toBe("2026-10-10T00:00:00Z");
  expect((screen.getByLabelText("팝업 이름") as HTMLInputElement).value).toBe("테스트 팝업");
  expect((screen.getByLabelText("예약 오픈 일시 · 한국 시간(KST)") as HTMLInputElement).value).toBe("2026-10-20T14:00");
  expect((screen.getByLabelText("상태") as HTMLSelectElement).value).toBe("PUBLISHED");
  expect(screen.getByText("영문으로 입력해 주세요.")).toBeTruthy();
});
