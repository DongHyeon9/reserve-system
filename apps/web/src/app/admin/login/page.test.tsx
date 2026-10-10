import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import AdminLoginPage from "./page";

test("renders admin login heading", () => {
  render(<AdminLoginPage />);
  expect(screen.getByRole("heading", { level: 1, name: "관리자 로그인" })).toBeDefined();
});
