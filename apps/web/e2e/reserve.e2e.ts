import { expect, test, type Page } from "@playwright/test";
import { sql } from "./db";

// psql may append the "INSERT 0 1" command tag after the returned row.
const returningId = (statement: string) => sql(statement).split(/\r?\n/)[0].trim();

async function openReserveFormAs(page: Page, popupId: string, slotId: string, email: string) {
  await page.goto(`/popups/${popupId}`);
  await page.getByRole("link", { name: /예약하기$/ }).click();
  await expect(page).toHaveURL(/\/login\?next=/);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "로그인하고 계속" }).click();
  await expect(page).toHaveURL(`/popups/${popupId}/reserve?slotId=${slotId}`);
  await expect(page.getByLabel("예약 안내 이메일")).toHaveValue(email);
  await page.getByLabel("이름").fill("김팝업");
  await page.getByLabel("휴대폰 번호").fill("010-1234-5678");
  await page.getByRole("checkbox").check();
}

test("login → reserve the last seat → complete; a concurrent second user gets SOLD_OUT with input kept", async ({ page, browser }) => {
  const stamp = Date.now();
  const popupId = returningId(`insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('E2E 예약 ${stamp}', 'E2E', '성수', '테크', 'E2E 요약', '서울 성동구 1', '매일 11:00 — 20:00', 40, current_date, current_date + 30, 'PUBLISHED', now() - interval '1 day')
    returning id`);
  const slotId = returningId(`insert into slots (popup_id, starts_at, ends_at, capacity)
    values (${popupId}, date_trunc('hour', now()) + interval '2 days', date_trunc('hour', now()) + interval '2 days 1 hour', 1)
    returning id`);

  // The second user opens the form while the seat is still free, in a separate session.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await openReserveFormAs(otherPage, popupId, slotId, `e2e-b-${stamp}@example.com`);

  await openReserveFormAs(page, popupId, slotId, `e2e-a-${stamp}@example.com`);
  await page.getByRole("button", { name: "예약 확정" }).click();
  await expect(page).toHaveURL(/\/reservations\/[^/]+\/complete$/);
  await expect(page.getByRole("heading", { name: "예약이 완료됐어요!" })).toBeVisible();
  await expect(page.getByText(/^PS-/)).toBeVisible();

  await otherPage.getByRole("button", { name: "예약 확정" }).click();
  await expect(otherPage.getByRole("alert").filter({ hasText: "잔여석" })).toHaveText(/선택한 회차의 잔여석이 부족합니다/);
  await expect(otherPage).toHaveURL(`/popups/${popupId}/reserve?slotId=${slotId}`);
  await expect(otherPage.getByLabel("이름")).toHaveValue("김팝업");
  await expect(otherPage.getByLabel("휴대폰 번호")).toHaveValue("010-1234-5678");
  await other.close();
});
