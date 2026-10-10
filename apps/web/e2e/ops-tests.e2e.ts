import { expect, test, type Page } from "@playwright/test";
import { sql } from "./db";

async function devLogin(page: Page, email: string) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeVisible();
}

const grant = (email: string, ...roles: string[]) =>
  roles.forEach((role) => sql(`insert into user_roles (user_id, role) select id, '${role}' from app_users where email = '${email}'`));

async function startRun(page: Page, scenario: string, values: Record<string, string>) {
  await page.getByRole("button", { name: scenario }).click();
  for (const [label, value] of Object.entries(values)) await page.getByLabel(label).fill(value);
  await page.getByLabel("운영 데이터와 분리된 테스트임을 확인했습니다.").check();
  await page.getByLabel("확인을 위해 TEST 입력").fill("TEST");
  await page.getByRole("button", { name: "테스트 실행" }).click();
}

const status = (page: Page) => page.locator("#ops-run-status");

test("admin without OPS_TEST sees the permission panel", async ({ page }) => {
  const email = `e2e-ops-noperm-${Date.now()}@example.com`;
  await devLogin(page, email);
  grant(email, "ADMIN");
  await page.goto("/admin/operations/tests");
  await expect(page.getByRole("alert").filter({ hasText: "운영도구(OPS_TEST) 권한이 필요합니다." })).toBeVisible();
  await expect(page.getByRole("button", { name: "테스트 실행" })).toHaveCount(0);
});

test("concurrent reserve run completes with zero overbooking; a load run can be stopped", async ({ page }) => {
  test.setTimeout(90_000);
  const email = `e2e-ops-${Date.now()}@example.com`;
  await devLogin(page, email);
  grant(email, "ADMIN", "OPS_TEST");
  await page.goto("/admin/operations/tests");
  await expect(page.getByText("테스트 전용 환경에 연결됨")).toBeVisible();
  await expect(page.locator(".environment-chip")).toHaveText("SANDBOX");

  await startRun(page, "동시 예약", {
    "가상 사용자 · 최대 100": "20",
    "목표 RPS · 최대 100": "20",
    "지속 시간 · 5~60초": "5",
    "테스트 회차 정원 · 1~200": "10",
  });
  await expect(status(page)).toHaveText("테스트 실행 중");
  await expect(page.getByRole("button", { name: "즉시 중지" })).toBeVisible();
  await expect(page.getByRole("button", { name: "실행 중" })).toBeDisabled();
  await expect(status(page)).toHaveText("테스트 완료", { timeout: 20_000 });
  await expect(page.locator('[data-metric="overbooked"]')).toContainText("0건");
  await expect(page.locator(".data-table tbody tr").first()).toContainText("통과 · 초과 0");

  await startRun(page, "부하", { "지속 시간 · 5~60초": "60" });
  await expect(status(page)).toHaveText("테스트 실행 중");
  await page.getByRole("button", { name: "즉시 중지" }).click();
  await expect(status(page)).toHaveText("테스트 중지됨");
  await expect(status(page)).toBeFocused();
  await expect(page.locator(".data-table tbody tr").first()).toContainText("중지");
});
