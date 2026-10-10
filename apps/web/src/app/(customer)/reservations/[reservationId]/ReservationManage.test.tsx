import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeAll, expect, test, vi } from "vitest";
import type { CancelState } from "./actions";
import { StatusBadge } from "./CancelReservation";
import { ReservationManage } from "./ReservationManage";

afterEach(cleanup);

// jsdom lacks a modal implementation; emulate open/close (incl. the close event) closely enough for focus checks.
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = function (this: HTMLDialogElement) {
    this.setAttribute("open", "");
    this.querySelector("button")?.focus(); // native showModal focuses the first focusable element
  };
  HTMLDialogElement.prototype.close = function (this: HTMLDialogElement) {
    this.removeAttribute("open");
    this.dispatchEvent(new Event("close"));
  };
});

type Action = (state: CancelState, form: FormData) => Promise<CancelState>;
type Props = Parameters<typeof ReservationManage>[0]["reservation"];
const base: Props = { id: "r-1", status: "CONFIRMED", cancellable: true, cancellableUntil: "2026-10-17T06:00:00Z", cancelledAt: null };
const renderManage = (reservation: Partial<Props> = {}, action: Action = async (s) => s) =>
  render(<ReservationManage reservation={{ ...base, ...reservation }} action={action} />);

test("cancellable: shows the KST deadline and a cancel button", () => {
  renderManage();
  expect(screen.getByText("2026년 10월 17일 토요일 15:00 (KST)까지 무료 취소할 수 있습니다.")).toBeDefined();
  expect(screen.getByRole("button", { name: "예약 취소" })).toBeDefined();
});

test("deadline passed: explains why and offers no button", () => {
  renderManage({ cancellable: false });
  expect(screen.getByText(/무료 취소 가능 시간\(2026년 10월 17일 토요일 15:00 \(KST\)\)이 지나/)).toBeDefined();
  expect(screen.queryByRole("button")).toBeNull();
});

test("cancelled and checked-in states", () => {
  renderManage({ status: "CANCELLED", cancellable: false, cancelledAt: "2026-10-10T01:30:00Z" });
  expect(screen.getByText(/취소된 예약입니다\./)).toBeDefined();
  expect(screen.getByText(/2026년 10월 10일 토요일 10:30 \(KST\)/)).toBeDefined();
  expect(screen.queryByRole("button")).toBeNull();
  cleanup();
  renderManage({ status: "CHECKED_IN", cancellable: false });
  expect(screen.getByText("체크인된 예약은 취소할 수 없습니다.")).toBeDefined();
});

test("dialog opens with focus inside, 돌아가기 closes and returns focus to the trigger", () => {
  const { container } = renderManage();
  const trigger = screen.getByRole("button", { name: "예약 취소" });
  const dialog = container.querySelector("dialog")!;
  trigger.focus();
  fireEvent.click(trigger);
  expect(dialog.open).toBe(true);
  expect(dialog.contains(document.activeElement)).toBe(true);
  fireEvent.click(screen.getByRole("button", { name: "돌아가기", hidden: true }));
  expect(dialog.open).toBe(false);
  expect(document.activeElement).toBe(trigger);
});

test("confirm posts the reservation id and shows a mapped error alert", async () => {
  const action = vi.fn(async (_s: CancelState, form: FormData): Promise<CancelState> => {
    expect(form.get("reservationId")).toBe("r-1");
    return { message: "무료 취소 가능 시간이 지났습니다." };
  });
  renderManage({}, action);
  fireEvent.click(screen.getByRole("button", { name: "예약 취소" }));
  await act(async () => fireEvent.click(screen.getByRole("button", { name: "예약 취소 확인", hidden: true })));
  expect(action).toHaveBeenCalledOnce();
  expect(screen.getByRole("alert", { hidden: true }).textContent).toContain("무료 취소 가능 시간이 지났습니다.");
});

test("status badge takes focus only when asked", () => {
  render(<StatusBadge className="badge badge-neutral" label="취소" focus />);
  expect(document.activeElement?.id).toBe("booking-status");
  cleanup();
  render(<StatusBadge className="badge badge-success" label="예약 확정" />);
  expect(document.activeElement?.id).not.toBe("booking-status");
});
