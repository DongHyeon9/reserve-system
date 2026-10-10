// Shared by the ops test page, its server actions and the client console. Spring enforces every limit again.
import { adminErrorMessage } from "./admin-popups";
import type { OpsLimits, OpsRun, OpsScenario } from "./types";

export const SCENARIOS: { value: OpsScenario; icon: string; label: string; description: string }[] = [
  { value: "LOAD", icon: "↗", label: "부하", description: "트래픽 급증과 응답 시간" },
  { value: "CONCURRENT_RESERVE", icon: "⇄", label: "동시 예약", description: "정원·중복 예약 불변식" },
  { value: "LATENCY", icon: "◷", label: "지연", description: "API 지연과 타임아웃" },
  { value: "FAULT", icon: "!", label: "장애", description: "통제된 5xx 오류 주입" },
];

export const scenarioLabel = (scenario: OpsScenario) => SCENARIOS.find((s) => s.value === scenario)?.label ?? scenario;

export const DEFAULT_LIMITS: OpsLimits = { maxVirtualUsers: 100, maxRps: 100, maxDurationSeconds: 60, dataTtlMinutes: 10 };

export const RUN_FIELDS = ["virtualUsers", "targetRps", "durationSeconds", "capacity"] as const;
export type RunField = (typeof RUN_FIELDS)[number];
export type RunValues = Record<RunField, string>;

export function fieldRanges(limits: OpsLimits): Record<RunField, [number, number]> {
  return {
    virtualUsers: [1, limits.maxVirtualUsers],
    targetRps: [1, limits.maxRps],
    durationSeconds: [5, limits.maxDurationSeconds],
    capacity: [1, 200],
  };
}

/** Field → message for every value that is not a whole number inside its range. */
export function validateRun(values: RunValues, limits: OpsLimits = DEFAULT_LIMITS) {
  const errors: Partial<Record<RunField, string>> = {};
  for (const [field, [min, max]] of Object.entries(fieldRanges(limits)) as [RunField, [number, number]][]) {
    const raw = values[field].trim();
    const n = Number(raw);
    if (!/^\d+$/.test(raw) || n < min || n > max) errors[field] = `${min}~${max} 사이의 정수를 입력해 주세요.`;
  }
  return errors;
}

export const CONFIRM_WORD = "TEST";

/** Run is offered only after the safety check, the exact confirm word, valid inputs, and no run in progress. */
export function canRun(o: { checked: boolean; confirmWord: string; valid: boolean; running: boolean }) {
  return o.checked && o.confirmWord.trim() === CONFIRM_WORD && o.valid && !o.running;
}

/** "99.92%"; "—" before the first request. */
export function successRate({ requests, successes }: OpsRun["metrics"]) {
  return requests === 0 ? "—" : `${((successes / requests) * 100).toFixed(2)}%`;
}

export function runBadge(run: OpsRun) {
  switch (run.status) {
    case "RUNNING":
      return { text: "실행 중", className: "badge-blue" };
    case "STOPPED":
      return { text: "중지", className: "badge-neutral" };
    case "FAILED":
      return { text: "오류", className: "badge-danger" };
    case "COMPLETED":
      return run.metrics.overbooked > 0
        ? { text: `실패 · 초과 ${run.metrics.overbooked}`, className: "badge-danger" }
        : { text: "통과 · 초과 0", className: "badge-success" };
  }
}

export const STATUS_TEXT: Record<OpsRun["status"], string> = {
  RUNNING: "테스트 실행 중",
  STOPPED: "테스트 중지됨",
  COMPLETED: "테스트 완료",
  FAILED: "테스트 오류",
};

export const FORBIDDEN_MESSAGE = "운영도구(OPS_TEST) 권한이 필요합니다.";
export const DISABLED_MESSAGE = "이 환경에서는 운영 테스트가 비활성화되어 있습니다(운영 환경 차단).";

const messages: Record<string, string> = {
  TEST_ALREADY_RUNNING: "이미 실행 중인 테스트가 있습니다.",
  OPS_TESTS_DISABLED: DISABLED_MESSAGE,
  FORBIDDEN: FORBIDDEN_MESSAGE,
};

export function opsErrorMessage(code: string, detail?: string) {
  return messages[code] ?? adminErrorMessage(code, detail);
}
