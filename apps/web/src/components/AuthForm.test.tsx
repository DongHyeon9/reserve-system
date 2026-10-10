import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { AuthForm } from "./AuthForm";

vi.mock("@/app/auth-actions", () => ({ login: vi.fn(), signup: vi.fn() }));
afterEach(cleanup);

test("auth form toggles between login and sign-up, adding the name field and 8-char password rule", () => {
  render(<AuthForm next="/reservations" />);
  expect(screen.queryByLabelText("이름")).toBeNull();
  expect(screen.getByLabelText("비밀번호").getAttribute("minlength")).toBeNull();
  expect(screen.getByRole("button", { name: "로그인하고 계속" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "30초 만에 가입하기" }));
  expect(screen.getByRole("heading", { name: "회원가입" })).toBeTruthy();
  expect(screen.getByLabelText("이름").hasAttribute("required")).toBe(true);
  expect(screen.getByLabelText("비밀번호").getAttribute("minlength")).toBe("8");
  expect(screen.getByRole("button", { name: "가입하고 계속" })).toBeTruthy();

  fireEvent.click(screen.getByRole("button", { name: "로그인하기" }));
  expect(screen.getByRole("heading", { name: "로그인" })).toBeTruthy();
  expect(screen.queryByLabelText("이름")).toBeNull();
});

test("auth form carries the return path and can open in sign-up mode", () => {
  const { container } = render(<AuthForm next="/popups/1/reserve" initialMode="signup" />);
  expect(container.querySelector<HTMLInputElement>('input[name="next"]')?.value).toBe("/popups/1/reserve");
  expect(screen.getByRole("button", { name: "가입하고 계속" })).toBeTruthy();
});
