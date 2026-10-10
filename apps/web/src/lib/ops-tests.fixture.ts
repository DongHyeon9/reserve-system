import type { OpsRun } from "./types";

/** Test fixture only. */
export const opsRun = (over: Partial<OpsRun> = {}, metrics: Partial<OpsRun["metrics"]> = {}): OpsRun => ({
  id: "run-1",
  scenario: "CONCURRENT_RESERVE",
  status: "RUNNING",
  virtualUsers: 20,
  targetRps: 20,
  durationSeconds: 5,
  capacity: 10,
  startedAt: "2026-10-10T04:20:00Z",
  endedAt: null,
  startedByMasked: "ops-a***@example.com",
  metrics: { requests: 0, successes: 0, failures: 0, p95Ms: 0, reservedCount: 0, overbooked: 0, ...metrics },
  events: [],
  ...over,
});
