import { expect, test, type Page } from "@playwright/test";
import { sql } from "./db";

// psql may append the "INSERT 0 1" command tag after the returned row.
const returningId = (statement: string) => sql(statement).split(/\r?\n/)[0].trim();
const kstDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

async function devLogin(page: Page, email: string) {
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
}

/** A reservation for a synthetic customer, inserted directly with the seat already counted. */
function insertReservation(popupId: string, slotId: string, phoneTail: string) {
  // One active reservation per user and slot, so each gets its own synthetic user.
  const userId = returningId(`insert into app_users (id, email) values (gen_random_uuid(), 'e2e-guest-' || gen_random_uuid() || '@example.com') returning id`);
  const code = `PS-E2E-${Math.random().toString(36).slice(2, 10).toUpperCase()}`;
  const id = returningId(`insert into reservations (code, user_id, popup_id, slot_id, party_size, contact_name, contact_phone, contact_email)
    values ('${code}', '${userId}', ${popupId}, ${slotId}, 2, '김이투이', '010-1234-${phoneTail}', 'e2e-guest@example.com') returning id`);
  sql(`insert into reservation_events (reservation_id, type, actor_id, actor_role) values ('${id}', 'CREATED', '${userId}', 'CUSTOMER')`);
  sql(`update slots set reserved_count = reserved_count + 2 where id = ${slotId}`);
  return code;
}

test("admin searches a reservation, reveals contact, checks in, and cancels another with a reason", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-resv-admin-${stamp}@example.com`;
  const phoneTail = String(stamp).slice(-4);

  // Check-in needs a visit later today in KST; near KST midnight fall back to tomorrow and expect a refusal.
  const startsAt = new Date(Math.ceil((Date.now() + 30 * 60_000) / 60_000) * 60_000);
  const today = kstDay(startsAt) === kstDay(new Date());
  const popupId = returningId(`insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('E2E 예약 운영 ${stamp}', 'E2E', '성수', '테크', 'E2E 요약', '서울 성동구 1', '매일 11:00 — 20:00', 40, current_date - 1, current_date + 30, 'PUBLISHED', now() - interval '1 day')
    returning id`);
  const slotId = returningId(`insert into slots (popup_id, starts_at, ends_at, capacity)
    values (${popupId}, '${startsAt.toISOString()}'::timestamptz + interval '${today ? 0 : 1} day', '${startsAt.toISOString()}'::timestamptz + interval '${today ? 0 : 1} day 30 minutes', 10)
    returning id`);
  const first = insertReservation(popupId, slotId, phoneTail);
  const second = insertReservation(popupId, slotId, phoneTail);
  expect(sql(`select reserved_count from slots where id = ${slotId}`)).toBe("4");

  await devLogin(page, email);
  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeVisible();
  sql(`insert into user_roles (user_id, role) select id, 'ADMIN' from app_users where email = '${email}'`);

  // Search by code → detail.
  await page.goto("/admin/reservations");
  await page.getByLabel("예약 검색").fill(first.toLowerCase());
  await page.getByRole("button", { name: "필터 적용" }).click();
  await expect(page.getByText("예약 1건")).toBeVisible();
  const row = page.getByRole("row", { name: new RegExp(first) });
  await expect(row.getByText("김이투이")).toBeVisible();
  await expect(row.getByText(`010-1234-${phoneTail}`)).toHaveCount(0);
  await row.getByRole("link", { name: `${first} 상세 보기` }).click();
  await expect(page.getByRole("heading", { name: "예약 상세" })).toBeVisible();
  await expect(page.locator("#booking-status")).toHaveText("예약 확정");

  // Contact is masked until 보기.
  await expect(page.getByText(`010-1234-${phoneTail}`)).toHaveCount(0);
  await page.getByRole("button", { name: "보기" }).click();
  await expect(page.getByText(`010-1234-${phoneTail}`)).toBeVisible();
  await expect(page.getByText("e2e-guest@example.com")).toBeVisible();

  if (!today) {
    await expect(page.getByRole("button", { name: "체크인 처리" })).toBeDisabled();
    await expect(page.getByText("체크인은 방문 당일에만 가능합니다.").first()).toBeVisible();
    test.info().annotations.push({ type: "skip-assertion", description: "KST day ends within 30 minutes; check-in success not asserted" });
  } else {
    await page.getByRole("button", { name: "체크인 처리" }).click();
    await expect(page.getByRole("status").filter({ hasText: "체크인했습니다." })).toBeVisible();
    await expect(page.locator("#booking-status")).toHaveText("체크인");
    await expect(page.locator(".timeline li strong", { hasText: /^체크인$/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "예약 취소" })).toHaveCount(0);
    await expect(page.getByRole("button", { name: "체크인 처리" })).toHaveCount(0);
  }

  // Second reservation: admin cancel with a reason returns the seats.
  await page.goto(`/admin/reservations?q=${second}`);
  await page.getByRole("link", { name: `${second} 상세 보기` }).click();
  await page.getByRole("button", { name: "예약 취소" }).click();
  await page.getByLabel("취소 사유").fill("E2E 현장 요청");
  await page.getByRole("button", { name: "예약 취소 확인" }).click();
  await expect(page.getByRole("status").filter({ hasText: "예약을 취소했습니다." })).toBeVisible();
  await expect(page.locator("#booking-status")).toHaveText("취소");
  await expect(page.locator(".timeline li strong", { hasText: "예약 취소" })).toBeVisible();
  expect(sql(`select reserved_count from slots where id = ${slotId}`)).toBe("2");
});
