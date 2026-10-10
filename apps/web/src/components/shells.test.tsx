import { render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { cleanup } from "@testing-library/react";
import { AdminShell } from "./AdminShell";
import { CustomerHeader } from "./CustomerHeader";

let pathname = "/";
vi.mock("next/navigation", () => ({ usePathname: () => pathname }));
vi.mock("@/app/auth-actions", () => ({ logout: vi.fn() }));
afterEach(cleanup);

test("customer header marks the current section", () => {
  pathname = "/popups/1";
  render(<CustomerHeader />);
  const nav = screen.getByRole("navigation", { name: "주요 메뉴" });
  expect(nav.querySelector('[aria-current="page"]')?.textContent).toBe("팝업 둘러보기");
});

test("admin shell exposes labelled navigation and a main landmark", () => {
  pathname = "/admin";
  render(<AdminShell><p>본문</p></AdminShell>);
  expect(screen.getByRole("link", { name: "대시보드" }).getAttribute("aria-current")).toBe("page");
  expect(screen.getByRole("link", { name: "팝업 관리" }).getAttribute("aria-current")).toBeNull();
  expect(screen.getByRole("main").textContent).toBe("본문");
});

test("customer header switches between login link and logout button", () => {
  pathname = "/";
  const { rerender } = render(<CustomerHeader />);
  expect(screen.getByRole("link", { name: "로그인" }).getAttribute("href")).toBe("/login");
  rerender(<CustomerHeader signedIn />);
  expect(screen.getByRole("button", { name: "로그아웃" })).toBeDefined();
});
