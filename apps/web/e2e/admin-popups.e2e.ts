import { expect, test } from "@playwright/test";
import { sql } from "./db";
import { addDays } from "../src/lib/time";

const kstDay = (date: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Seoul" }).format(date);

test("admin creates a scheduled popup, publishes it, manages slots, and customers see it waiting", async ({ page }) => {
  const stamp = Date.now();
  const email = `e2e-popup-admin-${stamp}@example.com`;
  const title = `E2E 팝업 관리 ${stamp}`;
  const today = kstDay(new Date());
  const slotDay = addDays(today, 3);

  await page.goto("/admin");
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "관리자 로그인" }).click();
  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeVisible();
  sql(`insert into user_roles (user_id, role) select id, 'ADMIN' from app_users where email = '${email}'`);

  // Create a DRAFT popup that opens two days from now at 14:00 KST.
  await page.goto("/admin/popups/new");
  await page.getByLabel("팝업 이름").fill(title);
  await page.getByLabel("포스터 라벨 (영문)").fill("E2E LAB");
  await page.getByLabel("카테고리").fill("테크");
  await page.getByLabel("지역").fill("성수");
  await page.getByLabel("한 줄 소개").fill("E2E 요약");
  await page.getByLabel("시작일 · 한국 시간(KST)").fill(today);
  await page.getByLabel("종료일 · 한국 시간(KST)").fill(addDays(today, 10));
  await page.getByLabel("주소").fill("서울 성동구 1");
  await page.getByLabel("운영 시간").fill("매일 11:00 — 20:00");
  await page.getByLabel("공간 소개").fill("E2E 공간 소개");
  await page.getByLabel("날짜·시간 지정").check();
  await page.getByLabel("예약 오픈 일시 · 한국 시간(KST)").fill(`${addDays(today, 2)}T14:00`);
  await page.getByRole("button", { name: "변경 저장" }).click();

  await expect(page).toHaveURL(/\/admin\/popups\/\d+\/edit\?saved=1$/);
  await expect(page.getByText("저장했습니다.")).toBeVisible();
  await expect(page.getByLabel("예약 오픈 일시 · 한국 시간(KST)")).toHaveValue(`${addDays(today, 2)}T14:00`);
  const popupId = /\/admin\/popups\/(\d+)\//.exec(page.url())![1];

  await page.getByLabel("상태").selectOption("PUBLISHED");
  // The URL does not change on a re-save, so wait for the server action round trip itself.
  await Promise.all([
    page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(`/admin/popups/${popupId}/edit`)),
    page.getByRole("button", { name: "변경 저장" }).click(),
  ]);
  await page.goto(`/admin/popups?q=${encodeURIComponent(title)}`);
  const row = page.getByRole("row", { name: new RegExp(title) });
  await expect(row.locator(".badge", { hasText: "게시 중" })).toBeVisible();
  await expect(row.locator(".badge", { hasText: "오픈 대기" })).toBeVisible();
  await expect(row.getByText(/14:00 KST 자동 오픈$/)).toBeVisible();

  // Slots: one manual slot, then a bulk run over two days.
  await row.getByRole("link", { name: `${title} 회차` }).click();
  await expect(page.getByRole("heading", { name: "회차·정원 관리" })).toBeVisible();
  await page.locator("#slot-date").fill(slotDay);
  await page.getByLabel("시작 시간 · 한국 시간(KST)").fill("11:00");
  await page.getByLabel("종료 시간 · 한국 시간(KST)").fill("12:00");
  await page.locator("#slot-capacity").fill("20");
  await page.getByRole("button", { name: "＋ 회차 추가" }).click();
  await expect(page.getByText("회차를 추가했습니다.")).toBeVisible();

  await page.locator("#bulk-from").fill(slotDay);
  await page.locator("#bulk-to").fill(addDays(slotDay, 1));
  await page.getByLabel("시작 시간 목록 · 한국 시간(KST)").fill("11:00, 13:00, 15:00");
  await page.locator("#bulk-duration").fill("60");
  await page.locator("#bulk-capacity").fill("10");
  await page.getByRole("button", { name: "일괄 생성" }).click();
  // 11:00 on the first day already exists and is skipped.
  await expect(page.getByText("5개 생성, 1개 건너뜀")).toBeVisible();

  await page.goto(`/admin/popups/${popupId}/slots?date=${slotDay}`);
  for (const time of ["11:00—12:00", "13:00—14:00", "15:00—16:00"]) {
    await expect(page.getByRole("cell", { name: time, exact: true })).toBeVisible();
  }

  // Capacity 0 is rejected by validation; capacity below the reserved count by the reserved check.
  await page.getByLabel("11:00—12:00 회차 정원").fill("0");
  await page.getByRole("row", { name: /11:00—12:00/ }).getByRole("button", { name: "정원 변경" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "입력값을 확인해 주세요." })).toBeVisible();

  sql(`update slots set reserved_count = 5 where popup_id = ${popupId} and starts_at = '${slotDay}T11:00:00+09:00'`);
  await page.reload();
  await page.getByLabel("11:00—12:00 회차 정원").fill("3");
  await page.getByRole("row", { name: /11:00—12:00/ }).getByRole("button", { name: "정원 변경" }).click();
  await expect(page.getByRole("alert").filter({ hasText: "예약 인원보다 정원을 작게 변경할 수 없습니다." })).toBeVisible();
  await expect(page.getByLabel("11:00—12:00 회차 정원")).toHaveValue("3");
  await expect(page.getByRole("button", { name: "11:00—12:00 회차 삭제" })).toBeDisabled();

  // Customers see the published popup as waiting for its scheduled open.
  await page.goto(`/popups?q=${encodeURIComponent(title)}`);
  await expect(page.getByText("팝업 1개")).toBeVisible();
  await expect(page.locator(".badge", { hasText: "오픈 대기" })).toBeVisible();
});
