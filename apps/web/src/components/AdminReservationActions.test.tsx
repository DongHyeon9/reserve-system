import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import type { ActionState } from "@/lib/admin-reservations";
import { AdminReservationActions, RevealContact } from "./AdminReservationActions";

afterEach(cleanup);
beforeAll(() => {
  // jsdom lacks the modal dialog API.
  HTMLDialogElement.prototype.showModal = function () { this.open = true; };
  HTMLDialogElement.prototype.close = function () { this.open = false; };
});

type Action = (state: ActionState, formData: FormData) => Promise<ActionState>;
const base = { reservationId: "r-1", cancelAction: vi.fn(), checkInAction: vi.fn() };

test("confirmed on the visit day: both actions are available", () => {
  render(<AdminReservationActions {...base} status="CONFIRMED" canCancel canCheckIn />);
  expect(screen.getByRole("button", { name: "예약 취소" })).toBeTruthy();
  expect((screen.getByRole("button", { name: "체크인 처리" }) as HTMLButtonElement).disabled).toBe(false);
  expect(screen.queryByText("체크인은 방문 당일에만 가능합니다.")).toBeNull();
});

test("confirmed before the visit day: check-in is disabled with an explanation", () => {
  render(<AdminReservationActions {...base} status="CONFIRMED" canCancel canCheckIn={false} />);
  expect((screen.getByRole("button", { name: "체크인 처리" }) as HTMLButtonElement).disabled).toBe(true);
  expect(screen.getByText("체크인은 방문 당일에만 가능합니다.")).toBeTruthy();
});

test("checked in: neither cancel nor check-in is offered", () => {
  render(<AdminReservationActions {...base} status="CHECKED_IN" canCancel={false} canCheckIn={false} />);
  expect(screen.queryByRole("button", { name: "예약 취소" })).toBeNull();
  expect(screen.queryByRole("button", { name: "체크인 처리" })).toBeNull();
});

test("cancel dialog requires a reason, keeps it and shows the mapped field error", async () => {
  const cancelAction = vi.fn<Action>(async (prev) => ({
    fieldErrors: { reason: "취소 사유를 1~200자로 입력해 주세요." },
    message: "입력값을 확인해 주세요.",
    attempt: (prev.attempt ?? 0) + 1,
  }));
  render(<AdminReservationActions {...base} cancelAction={cancelAction} status="CONFIRMED" canCancel canCheckIn={false} />);
  fireEvent.click(screen.getByRole("button", { name: "예약 취소" }));
  const reason = screen.getByLabelText("취소 사유") as HTMLTextAreaElement;
  expect(reason.required).toBe(true);
  expect(reason.maxLength).toBe(200);
  fireEvent.change(reason, { target: { value: "현장 요청" } });
  fireEvent.submit(reason.closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toContain("입력값을 확인해 주세요.");
  expect(screen.getByText("취소 사유를 1~200자로 입력해 주세요.")).toBeTruthy();
  expect(cancelAction.mock.calls[0][1].get("reason")).toBe("현장 요청");
  expect(reason.value).toBe("현장 요청");
});

test("a successful cancel closes the dialog and announces the result", async () => {
  const cancelAction = vi.fn(async (): Promise<ActionState> => ({ success: "예약을 취소했습니다." }));
  render(<AdminReservationActions {...base} cancelAction={cancelAction} status="CONFIRMED" canCancel canCheckIn={false} />);
  fireEvent.click(screen.getByRole("button", { name: "예약 취소" }));
  const reason = screen.getByLabelText("취소 사유");
  fireEvent.change(reason, { target: { value: "중복 예약" } });
  fireEvent.submit(reason.closest("form")!);
  expect((await screen.findByRole("status")).textContent).toBe("예약을 취소했습니다.");
  expect((reason.closest("dialog") as HTMLDialogElement).open).toBe(false);
});

test("a refused check-in shows the mapped error as an alert", async () => {
  const checkInAction = vi.fn(async (): Promise<ActionState> => ({ message: "체크인은 방문 당일에만 가능합니다." }));
  render(<AdminReservationActions {...base} checkInAction={checkInAction} status="CONFIRMED" canCancel canCheckIn />);
  fireEvent.click(screen.getByRole("button", { name: "체크인 처리" }));
  expect((await screen.findByRole("alert")).textContent).toContain("체크인은 방문 당일에만 가능합니다.");
});

test("contact stays masked until 보기 is clicked, then shows the full values", async () => {
  const action = vi.fn<Action>(async () => ({ contact: { contactPhone: "010-1234-5678", contactEmail: "pop@example.com" } }));
  render(<dl><RevealContact reservationId="r-1" phoneMasked="010-12**-56**" emailMasked="p***p@example.com" action={action} /></dl>);
  expect(screen.getByText("010-12**-56**")).toBeTruthy();
  expect(action).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "보기" }));
  expect(await screen.findByText("010-1234-5678")).toBeTruthy();
  expect(screen.getByText("pop@example.com")).toBeTruthy();
  expect(action.mock.calls[0][1].get("reservationId")).toBe("r-1");
  expect(screen.queryByRole("button", { name: "보기" })).toBeNull();
});
