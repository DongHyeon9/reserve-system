import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, expect, test, vi } from "vitest";
import { SocialLogin } from "./SocialLogin";

vi.mock("@/app/auth-actions", () => ({ oauthLogin: vi.fn() }));
afterEach(cleanup);

test("renders nothing until a provider is enabled", () => {
  const { container } = render(<SocialLogin providers={[]} next="/" loginPath="/login" />);
  expect(container.innerHTML).toBe("");
});

test("each provider is its own form carrying provider and return path", () => {
  render(<SocialLogin providers={["google", "kakao"]} next="/reservations" loginPath="/login" />);
  const google = screen.getByRole("button", { name: "Google로 계속하기" }).closest("form")!;
  expect((google.querySelector('input[name="provider"]') as HTMLInputElement).value).toBe("google");
  expect((google.querySelector('input[name="next"]') as HTMLInputElement).value).toBe("/reservations");
  expect(screen.getByRole("button", { name: "카카오로 계속하기" }).className).toContain("btn-kakao");
});
