import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Browser, type Page } from "@playwright/test";
import { sql } from "./db";

// Release readiness (SC-006D): every screen of the design map (customer 9, admin 8) must have no serious/critical
// axe violations (WCAG 2.1 AA) and no horizontal overflow at a 390px phone width.
const returningId = (statement: string) => sql(statement).split(/\r?\n/)[0].trim();

/** expect: content proving the intended state rendered (not an error, empty, forbidden, or disabled variant). */
type Screen = { id: string; path: string; signedIn: "customer" | "admin" | "none"; expect: (page: Page) => Promise<void> };

async function login(browser: Browser, path: "/login" | "/admin/login", email: string) {
  const context = await browser.newContext();
  const page = await context.newPage();
  await page.goto(path);
  await page.getByLabel("이메일").fill(email);
  await page.getByRole("button", { name: path === "/login" ? "로그인하고 계속" : "관리자 로그인" }).click();
  await page.waitForURL((url) => !url.pathname.endsWith("/login"));
  return page;
}

const see = (locator: import("@playwright/test").Locator) => expect(locator.first()).toBeVisible({ timeout: 5000 });

async function audit(page: Page, screen: Screen) {
  const problems: string[] = [];
  for (const width of [1280, 390]) {
    await page.setViewportSize({ width, height: 900 });
    const response = await page.goto(screen.path);
    if (!response || response.status() >= 400) problems.push(`${screen.id} @${width}: HTTP ${response?.status()}`);
    await page.waitForLoadState("networkidle");
    // A redirect (e.g. to a login page) would audit the wrong screen and pass silently.
    const landed = new URL(page.url());
    const wanted = new URL(screen.path, landed);
    if (landed.pathname !== wanted.pathname || landed.search !== wanted.search) problems.push(`${screen.id} @${width}: landed on ${landed.pathname}${landed.search}`);
    try {
      await screen.expect(page);
    } catch {
      problems.push(`${screen.id} @${width}: expected content missing (wrong state rendered)`);
    }
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    if (overflow > 1) problems.push(`${screen.id} @${width}: horizontal overflow ${overflow}px`);
    const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"]).analyze();
    for (const v of violations.filter((v) => v.impact === "serious" || v.impact === "critical")) {
      problems.push(`${screen.id} @${width}: ${v.impact} ${v.id} (${v.nodes.length}) ${v.nodes[0]?.target.join(" ")}`);
    }
  }
  return problems;
}

test("design-mapped screens pass accessibility and responsive checks", async ({ browser }) => {
  test.setTimeout(240_000);
  const stamp = Date.now();
  const customerEmail = `e2e-ready-${stamp}@example.com`;
  const adminEmail = `e2e-ready-admin-${stamp}@example.com`;

  const open = returningId(`insert into popups (title, label, area, category, summary, description, notice, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('준비도 점검 ${stamp}', 'Ready', '성수', '테크', '점검용 팝업', '공간 소개', '안내', '서울 성동구 1', '매일 11:00 — 20:00', 40, current_date, current_date + 10, 'PUBLISHED', now() - interval '1 day') returning id`);
  const slot = returningId(`insert into slots (popup_id, starts_at, ends_at, capacity) values (${open}, now() + interval '3 days', now() + interval '3 days 40 minutes', 10) returning id`);
  const waiting = returningId(`insert into popups (title, label, area, category, summary, address, operating_hours, visit_minutes, starts_on, ends_on, publish_status, opens_at)
    values ('오픈 대기 점검 ${stamp}', 'Soon', '한남', '패션', '점검용', '서울 용산구 1', '매일 12:00 — 21:00', 60, current_date + 5, current_date + 15, 'PUBLISHED', now() + interval '3 days') returning id`);

  const customer = await login(browser, "/login", customerEmail);
  await customer.goto("/reservations"); // provisions app_users through the API
  const userId = returningId(`select id from app_users where email = '${customerEmail}'`);
  const reservation = returningId(`insert into reservations (code, user_id, popup_id, slot_id, party_size, contact_name, contact_phone, contact_email)
    values ('PS-READY-${stamp}', '${userId}', ${open}, ${slot}, 2, '점검고객', '010-1234-5678', '${customerEmail}') returning id`);
  sql(`insert into reservation_events (reservation_id, type, actor_id, actor_role) values ('${reservation}', 'CREATED', '${userId}', 'CUSTOMER')`);
  sql(`update slots set reserved_count = reserved_count + 2 where id = ${slot}`);

  const admin = await login(browser, "/admin/login", adminEmail);
  sql(`insert into user_roles (user_id, role) select id, r from app_users, unnest(array['ADMIN','OPS_TEST']) r where email = '${adminEmail}' on conflict do nothing`);

  const anonymous = await (await browser.newContext()).newPage();
  const screens: [Page, Screen][] = [
    [anonymous, { id: "C1 홈", path: "/", signedIn: "none", expect: (p) => see(p.getByRole("heading", { level: 1, name: /어디에 빠져볼까요/ })) }],
    [anonymous, { id: "C2 팝업 탐색", path: `/popups?q=${encodeURIComponent(`준비도 점검 ${stamp}`)}`, signedIn: "none", expect: (p) => see(p.getByRole("heading", { name: `준비도 점검 ${stamp}` })) }],
    [anonymous, { id: "C3 팝업 상세", path: `/popups/${open}`, signedIn: "none", expect: (p) => see(p.getByRole("link", { name: /예약하기$/ })) }],
    [anonymous, { id: "C4 오픈 대기", path: `/popups/${waiting}`, signedIn: "none", expect: (p) => see(p.getByRole("heading", { name: "예약 오픈 대기" })) }],
    [anonymous, { id: "C5 로그인·가입", path: "/login", signedIn: "none", expect: (p) => see(p.getByRole("button", { name: "로그인하고 계속" })) }],
    [customer, { id: "C6 예약 작성", path: `/popups/${open}/reserve?slotId=${slot}`, signedIn: "customer", expect: (p) => see(p.getByRole("button", { name: "예약 확정" })) }],
    [customer, { id: "C7 예약 완료", path: `/reservations/${reservation}/complete`, signedIn: "customer", expect: (p) => see(p.getByText(`PS-READY-${stamp}`)) }],
    [customer, { id: "C8 내 예약", path: "/reservations", signedIn: "customer", expect: (p) => see(p.getByText(`PS-READY-${stamp}`)) }],
    [customer, { id: "C9 예약 상세·취소", path: `/reservations/${reservation}`, signedIn: "customer", expect: (p) => see(p.getByRole("button", { name: "예약 취소" })) }],
    [anonymous, { id: "A1 관리자 로그인", path: "/admin/login", signedIn: "none", expect: (p) => see(p.getByRole("button", { name: "관리자 로그인" })) }],
    [admin, { id: "A2 대시보드", path: "/admin", signedIn: "admin", expect: (p) => see(p.getByRole("heading", { level: 1, name: "운영 대시보드" })) }],
    [admin, { id: "A3 팝업 관리", path: `/admin/popups?q=${encodeURIComponent(`준비도 점검 ${stamp}`)}`, signedIn: "admin", expect: (p) => see(p.getByText(`준비도 점검 ${stamp}`)) }],
    [admin, { id: "A4 팝업 수정", path: `/admin/popups/${open}/edit`, signedIn: "admin", expect: (p) => see(p.locator(`input[value="준비도 점검 ${stamp}"]`)) }],
    [admin, { id: "A5 회차·정원", path: `/admin/popups/${open}/slots`, signedIn: "admin", expect: (p) => see(p.getByRole("heading", { level: 1, name: "회차·정원 관리" })) }],
    [admin, { id: "A6 예약 관리", path: `/admin/reservations?q=PS-READY-${stamp}`, signedIn: "admin", expect: (p) => see(p.getByText(`PS-READY-${stamp}`, { exact: true })) }],
    [admin, { id: "A7 예약 상세", path: `/admin/reservations/${reservation}`, signedIn: "admin", expect: (p) => see(p.getByRole("button", { name: "예약 취소" })) }],
    [admin, { id: "A8 운영 테스트", path: "/admin/operations/tests", signedIn: "admin", expect: (p) => see(p.getByRole("button", { name: "테스트 실행" })) }],
  ];
  expect(screens).toHaveLength(17);

  const problems: string[] = [];
  for (const [page, screen] of screens) problems.push(...(await audit(page, screen)));
  expect(problems, problems.join("\n")).toEqual([]);
});

test("the audit is able to fail: axe reports deliberate violations", async ({ page }) => {
  await page.setContent('<html lang="ko"><head><title>x</title></head><body><main><button></button><img src="x.png"></main></body></html>');
  const { violations } = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(violations.map((v) => v.id)).toEqual(expect.arrayContaining(["button-name", "image-alt"]));
});
