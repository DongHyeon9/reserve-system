import { expect, test } from "@playwright/test";
import { sql } from "./db";

// psql may append the "INSERT 0 1" command tag after the returned row.
const returningId = (statement: string) => sql(statement).split(/\r?\n/)[0].trim();

test("book → 내 예약 → detail → cancel via dialog returns the seat; another user gets 404", async ({ page, browser }) => {
  const stamp = Date.now();
  const title = `E2E 내예약 ${stamp}`;
  const popupId = returningId(`insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('${title}', 'E2E', '성수', '테크', 'E2E 요약', '서울 성동구 1', '매일 11:00 — 20:00', 40, current_date, current_date + 30, 'PUBLISHED', now() - interval '1 day')
    returning id`);
  // 3 days ahead: well inside the default 24h free-cancel window.
  const slotId = returningId(`insert into slots (popup_id, starts_at, ends_at, capacity)
    values (${popupId}, date_trunc('hour', now()) + interval '3 days', date_trunc('hour', now()) + interval '3 days 1 hour', 2)
    returning id`);

  await page.goto("/reservations");
  await expect(page).toHaveURL(/\/login\?next=%2Freservations/);
  await page.goto(`/popups/${popupId}`);
  await page.getByRole("link", { name: /예약하기$/ }).click();
  await page.getByLabel("이메일").fill(`e2e-my-${stamp}@example.com`);
  await page.getByRole("button", { name: "로그인하고 계속" }).click();
  await expect(page).toHaveURL(`/popups/${popupId}/reserve?slotId=${slotId}`);
  await page.getByLabel("이름").fill("김팝업");
  await page.getByLabel("휴대폰 번호").fill("010-1234-5678");
  await page.getByRole("checkbox").check();
  await page.getByRole("button", { name: "예약 확정" }).click();
  await expect(page).toHaveURL(/\/reservations\/[^/]+\/complete$/);
  expect(sql(`select reserved_count from slots where id = ${slotId}`)).toBe("1");

  await page.getByRole("navigation", { name: "주요 메뉴" }).getByRole("link", { name: "내 예약" }).click();
  await expect(page).toHaveURL("/reservations");
  await expect(page.getByRole("link", { name: /^예정 \d+$/ })).toHaveAttribute("aria-current", "page");
  const card = page.locator(".booking-card").filter({ hasText: title });
  await expect(card.getByText("예약 확정")).toBeVisible();
  await card.getByRole("link", { name: /예약 상세$/ }).click();
  await expect(page).toHaveURL(/\/reservations\/[^/?]+$/);
  const detailUrl = page.url();
  await expect(page.getByRole("heading", { name: "예약 상세" })).toBeVisible();
  await expect(page.getByText(/까지 무료 취소할 수 있습니다\.$/)).toBeVisible();

  // Keyboard: open, Escape closes and focus returns to the trigger.
  const trigger = page.getByRole("button", { name: "예약 취소", exact: true });
  await trigger.focus();
  await page.keyboard.press("Enter");
  const dialog = page.getByRole("dialog", { name: "예약을 취소할까요?" });
  await expect(dialog).toBeVisible();
  await expect(dialog.getByRole("button", { name: "돌아가기" })).toBeFocused();
  await page.keyboard.press("Escape");
  await expect(dialog).toBeHidden();
  await expect(trigger).toBeFocused();

  await trigger.click();
  await dialog.getByRole("button", { name: "예약 취소 확인" }).click();
  await expect(page.locator("#booking-status")).toHaveText("취소");
  await expect(page.locator("#booking-status")).toBeFocused();
  await expect(page.getByRole("status")).toHaveText(/예약이 취소되었습니다/);
  await expect(page.getByText("취소된 예약입니다.", { exact: false })).toBeVisible();
  expect(sql(`select reserved_count from slots where id = ${slotId}`)).toBe("0");

  await page.goto("/reservations?tab=CANCELLED");
  await expect(page.locator(".booking-card").filter({ hasText: title }).getByText("취소", { exact: true })).toBeVisible();
  await page.goto("/reservations");
  await expect(page.locator(".booking-card").filter({ hasText: title })).toHaveCount(0);

  // Ownership is enforced by Spring: another user sees the not-found page.
  const other = await browser.newContext();
  const otherPage = await other.newPage();
  await otherPage.goto(`/login?next=${encodeURIComponent(new URL(detailUrl).pathname)}`);
  await otherPage.getByLabel("이메일").fill(`e2e-other-${stamp}@example.com`);
  await otherPage.getByRole("button", { name: "로그인하고 계속" }).click();
  await expect(otherPage.getByRole("heading", { name: "페이지를 찾을 수 없습니다" })).toBeVisible();
  await other.close();
});
