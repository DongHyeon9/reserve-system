import { expect, test } from "vitest";
import { canRun, DEFAULT_LIMITS, opsErrorMessage, runBadge, scenarioLabel, successRate, validateRun } from "./ops-tests";
import { opsRun } from "./ops-tests.fixture";

const valid = { virtualUsers: "100", targetRps: "1", durationSeconds: "60", capacity: "200" };

test("validateRun accepts the boundaries and rejects out-of-range, decimals and blanks", () => {
  expect(validateRun(valid)).toEqual({});
  expect(validateRun({ ...valid, durationSeconds: "5", capacity: "1" })).toEqual({});
  const errors = validateRun({ virtualUsers: "101", targetRps: "0", durationSeconds: "4", capacity: "2.5" });
  expect(Object.keys(errors).sort()).toEqual(["capacity", "durationSeconds", "targetRps", "virtualUsers"]);
  expect(errors.virtualUsers).toBe("1~100 사이의 정수를 입력해 주세요.");
  expect(validateRun({ ...valid, targetRps: " " }).targetRps).toBeDefined();
  // Server-provided limits tighten the client rule.
  expect(validateRun(valid, { ...DEFAULT_LIMITS, maxVirtualUsers: 50 }).virtualUsers).toBe("1~50 사이의 정수를 입력해 주세요.");
});

test("canRun needs the check, exact TEST, valid inputs and no running test", () => {
  const ok = { checked: true, confirmWord: "TEST", valid: true, running: false };
  expect(canRun(ok)).toBe(true);
  expect(canRun({ ...ok, confirmWord: " TEST " })).toBe(true);
  expect(canRun({ ...ok, confirmWord: "test" })).toBe(false);
  expect(canRun({ ...ok, checked: false })).toBe(false);
  expect(canRun({ ...ok, valid: false })).toBe(false);
  expect(canRun({ ...ok, running: true })).toBe(false);
});

test("successRate and labels", () => {
  expect(successRate(opsRun().metrics)).toBe("—");
  expect(successRate(opsRun({}, { requests: 1250, successes: 1249 }).metrics)).toBe("99.92%");
  expect(scenarioLabel("CONCURRENT_RESERVE")).toBe("동시 예약");
  expect(scenarioLabel("FAULT")).toBe("장애");
});

test("runBadge maps result and overbooking", () => {
  expect(runBadge(opsRun({ status: "COMPLETED" }))).toEqual({ text: "통과 · 초과 0", className: "badge-success" });
  expect(runBadge(opsRun({ status: "COMPLETED" }, { overbooked: 3 }))).toEqual({ text: "실패 · 초과 3", className: "badge-danger" });
  expect(runBadge(opsRun({ status: "STOPPED" }))).toEqual({ text: "중지", className: "badge-neutral" });
  expect(runBadge(opsRun({ status: "FAILED" }))).toEqual({ text: "오류", className: "badge-danger" });
  expect(runBadge(opsRun()).text).toBe("실행 중");
});

test("opsErrorMessage maps ops codes and falls back to admin messages", () => {
  expect(opsErrorMessage("TEST_ALREADY_RUNNING")).toBe("이미 실행 중인 테스트가 있습니다.");
  expect(opsErrorMessage("OPS_TESTS_DISABLED")).toContain("비활성화");
  expect(opsErrorMessage("FORBIDDEN")).toBe("운영도구(OPS_TEST) 권한이 필요합니다.");
  expect(opsErrorMessage("VALIDATION_FAILED")).toBe("입력값을 확인해 주세요.");
});
