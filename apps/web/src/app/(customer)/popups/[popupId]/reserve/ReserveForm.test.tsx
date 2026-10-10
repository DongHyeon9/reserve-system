import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { ReserveState } from "@/lib/reservation-form";
import { ReserveForm } from "./ReserveForm";

afterEach(cleanup);

const summary = { label: "Loop Lab", title: "루프 랩", date: "2026년 10월 18일 일요일", time: "15:00", address: "서울 성동구 1" };
type Action = (state: ReserveState, form: FormData) => Promise<ReserveState>;
const renderForm = (action: Action = async (state) => state) =>
  render(<ReserveForm action={action} popupId={7} slotId={2} maxPartySize={3} idempotencyKey="key-12345678" email="me@example.com" summary={summary} />);

test("party size counter stays within 1..maxPartySize and feeds the summary", () => {
  const { container } = renderForm();
  const minus = screen.getByRole("button", { name: "인원 줄이기" });
  const plus = screen.getByRole("button", { name: "인원 늘리기" });
  const hidden = () => (container.querySelector('input[name="partySize"]') as HTMLInputElement).value;

  expect(hidden()).toBe("1");
  expect(minus.hasAttribute("disabled")).toBe(true);
  for (let i = 0; i < 5; i++) fireEvent.click(plus);
  expect(hidden()).toBe("3");
  expect(plus.hasAttribute("disabled")).toBe(true);
  expect(screen.getByText("3명")).toBeDefined();
  fireEvent.click(minus);
  expect(hidden()).toBe("2");
  expect(screen.getByText("최대 3명까지 예약 가능")).toBeDefined();
});

test("prefills email and carries the server-rendered idempotency key", () => {
  const { container } = renderForm();
  expect((screen.getByLabelText("예약 안내 이메일") as HTMLInputElement).value).toBe("me@example.com");
  expect((container.querySelector('input[name="idempotencyKey"]') as HTMLInputElement).value).toBe("key-12345678");
});

test("server errors show next to fields and in an alert while input is kept", async () => {
  const action = vi.fn(async (_state: ReserveState, form: FormData): Promise<ReserveState> => ({
    values: {
      partySize: Number(form.get("partySize")),
      contactName: String(form.get("contactName")),
      contactPhone: String(form.get("contactPhone")),
      contactEmail: String(form.get("contactEmail")),
      agree: form.get("agree") === "on",
    },
    fieldErrors: { contactPhone: "휴대폰 번호 형식이 올바르지 않습니다." },
    message: "선택한 회차의 잔여석이 부족합니다. 다른 회차를 선택해 주세요.",
    idempotencyKey: "fresh-key-123",
  }));
  const { container } = renderForm(action);
  fireEvent.click(screen.getByRole("button", { name: "인원 늘리기" }));
  fireEvent.change(screen.getByLabelText("이름"), { target: { value: "김팝업" } });
  fireEvent.change(screen.getByLabelText("휴대폰 번호"), { target: { value: "010-12" } });
  fireEvent.click(screen.getByRole("checkbox"));

  await act(async () => {
    fireEvent.submit(container.querySelector("form")!);
  });

  expect(action).toHaveBeenCalledOnce();
  expect(action.mock.calls[0][1].get("idempotencyKey")).toBe("key-12345678");
  expect(screen.getByRole("alert").textContent).toContain("잔여석이 부족합니다");
  const phone = screen.getByLabelText("휴대폰 번호");
  expect(phone.getAttribute("aria-invalid")).toBe("true");
  expect(document.getElementById(phone.getAttribute("aria-describedby")!)!.textContent).toBe("휴대폰 번호 형식이 올바르지 않습니다.");
  expect((phone as HTMLInputElement).value).toBe("010-12");
  expect((screen.getByLabelText("이름") as HTMLInputElement).value).toBe("김팝업");
  expect((screen.getByRole("checkbox") as HTMLInputElement).checked).toBe(true);
  expect((container.querySelector('input[name="partySize"]') as HTMLInputElement).value).toBe("2");
  expect((container.querySelector('input[name="idempotencyKey"]') as HTMLInputElement).value).toBe("fresh-key-123");
});
