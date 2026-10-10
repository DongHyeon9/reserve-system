import { expect, test } from "@playwright/test";
import { sql } from "./db";

// psql may append the "INSERT 0 1" command tag after the returned row.
const returningId = (statement: string) => sql(statement).split(/\r?\n/)[0].trim();

function insertPopup(title: string, opensAt: string) {
  const id = returningId(`insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('${title}', 'E2E', '성수', '테크', 'E2E 요약', '서울 성동구 1', '매일 11:00 — 20:00', 40, current_date, current_date + 30, 'PUBLISHED', ${opensAt})
    returning id`);
  const slotId = returningId(`insert into slots (popup_id, starts_at, ends_at, capacity)
    values (${id}, date_trunc('hour', now()) + interval '2 days', date_trunc('hour', now()) + interval '2 days 1 hour', 20)
    returning id`);
  return { id, slotId };
}

test("search an open popup, pick a slot, and see a waiting popup without a CTA", async ({ page }) => {
  const stamp = Date.now();
  const openTitle = `E2E 오픈 ${stamp}`;
  const waitingTitle = `E2E 대기 ${stamp}`;
  const open = insertPopup(openTitle, "now() - interval '1 day'");
  const waiting = insertPopup(waitingTitle, "now() + interval '3 days'");

  await page.goto("/popups");
  await page.getByLabel("팝업 검색").fill(openTitle);
  await page.getByRole("button", { name: "검색" }).click();
  await expect(page.getByText("팝업 1개")).toBeVisible();
  await page.getByRole("link", { name: `${openTitle} 상세 보기` }).click();

  await expect(page).toHaveURL(`/popups/${open.id}`);
  await expect(page.getByRole("heading", { level: 1, name: openTitle })).toBeVisible();
  await expect(page.getByRole("group", { name: "방문 시간" }).getByRole("button")).toHaveCount(1);
  await expect(page.getByRole("link", { name: /예약하기$/ })).toHaveAttribute("href", `/popups/${open.id}/reserve?slotId=${open.slotId}`);

  await page.goto(`/popups/${waiting.id}`);
  await expect(page.getByRole("heading", { name: "예약 오픈 대기" })).toBeVisible();
  await expect(page.getByRole("link", { name: /예약하기$/ })).toHaveCount(0);
  await expect(page.getByRole("button", { name: /오픈$/ })).toBeDisabled();
});
