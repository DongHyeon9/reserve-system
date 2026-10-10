import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import type { FormState } from "@/lib/admin-popups";
import { DEFAULT_LIMITS } from "@/lib/ops-tests";
import { opsRun } from "@/lib/ops-tests.fixture";
import { OpsLiveRun, OpsRunForm } from "./OpsTests";

const refresh = vi.fn();
vi.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
afterEach(() => {
  cleanup();
  refresh.mockReset();
  vi.useRealTimers();
  vi.unstubAllGlobals();
});

type Action = (state: FormState, formData: FormData) => Promise<FormState>;
const runButton = () => screen.getByRole("button", { name: "테스트 실행" }) as HTMLButtonElement;
const confirm = () => {
  fireEvent.click(screen.getByLabelText("운영 데이터와 분리된 테스트임을 확인했습니다."));
  fireEvent.change(screen.getByLabelText("확인을 위해 TEST 입력"), { target: { value: "TEST" } });
};

test("run button unlocks only after the safety check, TEST and valid inputs", () => {
  render(<OpsRunForm limits={DEFAULT_LIMITS} running={false} action={vi.fn()} />);
  expect(runButton().disabled).toBe(true);
  fireEvent.click(screen.getByLabelText("운영 데이터와 분리된 테스트임을 확인했습니다."));
  fireEvent.change(screen.getByLabelText("확인을 위해 TEST 입력"), { target: { value: "test" } });
  expect(runButton().disabled).toBe(true);
  fireEvent.change(screen.getByLabelText("확인을 위해 TEST 입력"), { target: { value: "TEST" } });
  expect(runButton().disabled).toBe(false);
  fireEvent.change(screen.getByLabelText("가상 사용자 · 최대 100"), { target: { value: "101" } });
  expect(runButton().disabled).toBe(true);
  expect(screen.getByText("1~100 사이의 정수를 입력해 주세요.")).toBeTruthy();
});

test("a running test locks the run button; FAULT shows a warning", () => {
  render(<OpsRunForm limits={DEFAULT_LIMITS} running action={vi.fn()} />);
  confirm();
  expect((screen.getByRole("button", { name: "실행 중" }) as HTMLButtonElement).disabled).toBe(true);
  const fault = screen.getByRole("button", { name: /장애/ });
  expect(screen.queryByText(/5xx 오류를 주입합니다/)).toBeNull();
  fireEvent.click(fault);
  expect(fault.getAttribute("aria-pressed")).toBe("true");
  expect(screen.getByText(/5xx 오류를 주입합니다/)).toBeTruthy();
});

test("server error is shown and inputs are kept", async () => {
  const action = vi.fn<Action>(async (prev) => ({ message: "이미 실행 중인 테스트가 있습니다.", attempt: (prev.attempt ?? 0) + 1 }));
  render(<OpsRunForm limits={DEFAULT_LIMITS} running={false} action={action} />);
  fireEvent.click(screen.getByRole("button", { name: /동시 예약/ }));
  fireEvent.change(screen.getByLabelText("가상 사용자 · 최대 100"), { target: { value: "20" } });
  confirm();
  fireEvent.submit(runButton().closest("form")!);
  expect((await screen.findByRole("alert")).textContent).toContain("이미 실행 중인 테스트가 있습니다.");
  const sent = action.mock.calls[0][1];
  expect(sent.get("scenario")).toBe("CONCURRENT_RESERVE");
  expect(sent.get("virtualUsers")).toBe("20");
  expect((screen.getByLabelText("가상 사용자 · 최대 100") as HTMLInputElement).value).toBe("20");
});

test("live card shows metrics, polls every second and stops after the run ends", async () => {
  vi.useFakeTimers();
  const responses = [
    opsRun({ events: ["reserve synthetic-*** 201"] }, { requests: 40, successes: 30, reservedCount: 6, p95Ms: 120 }),
    opsRun({ status: "COMPLETED", endedAt: "2026-10-10T04:20:05Z" }, { requests: 100, successes: 100, reservedCount: 10, p95Ms: 180 }),
  ];
  const fetchMock = vi.fn(async () => new Response(JSON.stringify(responses.shift()), { status: 200 }));
  vi.stubGlobal("fetch", fetchMock);
  render(<OpsLiveRun run={opsRun()} stopAction={vi.fn()} />);
  expect(screen.getByRole("status").textContent).toBe("테스트 실행 중");
  expect(screen.getByRole("button", { name: "즉시 중지" })).toBeTruthy();

  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(fetchMock).toHaveBeenCalledWith("/admin/operations/tests/current", { cache: "no-store" });
  expect(screen.getByText("40")).toBeTruthy();
  expect(screen.getByText("75.00%")).toBeTruthy();
  expect(screen.getByText("6/10")).toBeTruthy();
  expect(screen.getByText("reserve synthetic-*** 201")).toBeTruthy();

  await act(() => vi.advanceTimersByTimeAsync(1000));
  expect(screen.getByRole("status").textContent).toBe("테스트 완료");
  expect(screen.getByText("0건").className).toBe("metric-ok");
  expect(screen.queryByRole("button", { name: "즉시 중지" })).toBeNull();
  expect(refresh).toHaveBeenCalledTimes(1);

  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(fetchMock).toHaveBeenCalledTimes(2);
});

test("finished run does not poll and flags overbooking", async () => {
  vi.useFakeTimers();
  const fetchMock = vi.fn();
  vi.stubGlobal("fetch", fetchMock);
  render(<OpsLiveRun run={opsRun({ status: "COMPLETED" }, { overbooked: 2 })} stopAction={vi.fn()} />);
  await act(() => vi.advanceTimersByTimeAsync(3000));
  expect(fetchMock).not.toHaveBeenCalled();
  expect(screen.getByText("2건").className).toBe("metric-danger");
});
