import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { ApiError } from "@/lib/api";
import { DEFAULT_LIMITS } from "@/lib/ops-tests";
import { opsRun } from "@/lib/ops-tests.fixture";
import OpsTestsPage from "./page";

const apiFetch = vi.fn();
vi.mock("@/lib/api", async (orig) => ({ ...(await orig<typeof import("@/lib/api")>()), apiFetch: (path: string) => apiFetch(path) }));
vi.mock("@/lib/session", () => ({ getAccessToken: vi.fn() }));
vi.mock("./actions", () => ({ startTest: vi.fn(), stopTest: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn(), useRouter: () => ({ refresh: vi.fn() }) }));
afterEach(() => {
  cleanup();
  apiFetch.mockReset();
});

test("without OPS_TEST the page shows the permission panel and no controls", async () => {
  apiFetch.mockRejectedValue(new ApiError(403, "FORBIDDEN", "forbidden"));
  render(await OpsTestsPage());
  expect(screen.getByRole("alert").textContent).toContain("운영도구(OPS_TEST) 권한이 필요합니다.");
  expect(screen.queryByRole("button", { name: "테스트 실행" })).toBeNull();
});

test("disabled environment shows the production block banner and no controls", async () => {
  apiFetch.mockResolvedValue({ enabled: false, environment: "SANDBOX", limits: DEFAULT_LIMITS });
  render(await OpsTestsPage());
  expect(screen.getByRole("alert").textContent).toContain("이 환경에서는 운영 테스트가 비활성화되어 있습니다(운영 환경 차단).");
  expect(screen.queryByRole("button", { name: "테스트 실행" })).toBeNull();
  expect(apiFetch).toHaveBeenCalledTimes(1);
});

test("enabled: sandbox banner, controls and recent run badges", async () => {
  const done = opsRun({ id: "a", status: "COMPLETED" });
  apiFetch.mockImplementation(async (path: string) =>
    path.endsWith("/config")
      ? { enabled: true, environment: "SANDBOX", limits: DEFAULT_LIMITS }
      : path.endsWith("/current")
        ? done
        : [done, opsRun({ id: "b", status: "STOPPED" }), opsRun({ id: "c", status: "COMPLETED" }, { overbooked: 1 })],
  );
  render(await OpsTestsPage());
  expect(screen.getByText("SANDBOX")).toBeTruthy();
  expect(screen.getByRole("button", { name: "테스트 실행" })).toBeTruthy();
  expect(screen.getByText("통과 · 초과 0").className).toContain("badge-success");
  expect(screen.getByText("중지").className).toContain("badge-neutral");
  expect(screen.getByText("실패 · 초과 1").className).toContain("badge-danger");
  expect(screen.getAllByText("10.10 13:20 KST")).toHaveLength(3);
});
