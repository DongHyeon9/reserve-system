import { expect, test } from "@playwright/test";
import { sql } from "./db";

test("login returns to the requested page and admin access is decided by Spring", async ({ page }) => {
  const email = `e2e-${Date.now()}@example.com`;

  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login\?next=%2Fadmin/);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: "관리자 로그인" }).click();

  await expect(page.getByRole("heading", { name: "접근 권한이 없습니다" })).toBeVisible();

  sql(`insert into user_roles (user_id, role) select id, 'ADMIN' from app_users where email = '${email}'`);
  await page.reload();
  await expect(page.getByRole("heading", { name: "대시보드" })).toBeVisible();
  await expect(page.getByText(email)).toBeVisible();

  await page.getByRole("button", { name: "로그아웃" }).click();
  await expect(page).toHaveURL("http://localhost:3100/");
  await page.goto("/admin");
  await expect(page).toHaveURL(/\/admin\/login/);
});
