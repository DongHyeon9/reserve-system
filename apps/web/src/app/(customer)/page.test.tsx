import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import Home from "./page";

test("home hero links to popup discovery", () => {
  render(<Home />);
  expect(screen.getByRole("heading", { level: 1 }).textContent).toContain("어디에 빠져볼까요?");
  expect(screen.getByRole("link", { name: "팝업 둘러보기" }).getAttribute("href")).toBe("/popups");
});
