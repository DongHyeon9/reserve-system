import { expect, test, type Page } from "@playwright/test";
import { sql } from "./db";
import { kstTime } from "../src/lib/time";

const returningId = (statement: string) => sql(statement).split(/\r?\n/)[0].trim();
const kstDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

async function devLogin(page: Page, email: string) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
}

test("admin sees KPI cards and today's slot; a regular user is refused", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-admin-${stamp}@example.com`;
  const title = `E2E 대시보드 ${stamp}`;

  // The slot must start later today in KST; near KST midnight there is no room left, so the row check is skipped.
  const startsAt = new Date(Math.ceil((Date.now() + 10 * 60_000) / 60_000) * 60_000);
  const sameKstDay = kstDay(startsAt) === kstDay(new Date());
  const popupId = returningId(`insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('${title}', 'E2E', '성수', '테크', 'E2E 요약', '서울 성동구 1', '매일 11:00 — 20:00', 40, current_date - 1, current_date + 30, 'PUBLISHED', now() - interval '1 day')
    returning id`);
  if (sameKstDay) {
    sql(`insert into slots (popup_id, starts_at, ends_at, capacity)
      values (${popupId}, '${startsAt.toISOString()}', '${startsAt.toISOString()}'::timestamptz + interval '30 minutes', 10)`);
  } else {
    test.info().annotations.push({ type: "skip-assertion", description: "KST day ends within 10 minutes; slot row not asserted" });
  }

  await devLogin(page, email);
  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeVisible();

  sql(`insert into user_roles (user_id, role) select id, 'ADMIN' from app_users where email = '${email}'`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "운영 대시보드" })).toBeVisible();
  for (const label of ["오늘 예약", "오늘 방문", "운영 회차", "취소"]) {
    await expect(page.locator(".kpi-label", { hasText: new RegExp(`^${label}$`) })).toBeVisible();
  }
  if (sameKstDay) {
    const time = kstTime(startsAt.toISOString());
    const bar = page.getByRole("progressbar", { name: `${title} ${time} 회차 예약 현황` });
    await expect(bar).toHaveAttribute("aria-valuenow", "0");
    await expect(bar).toHaveAttribute("aria-valuemax", "10");
  }
});
