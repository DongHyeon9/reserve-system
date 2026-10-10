import { render, screen } from "@testing-library/react";
import { expect, test } from "vitest";
import PrivacyPage from "./privacy/page";
import TermsPage from "./terms/page";
import { CustomerFooter } from "@/components/CustomerFooter";

test("privacy and terms pages render and the footer links to them", () => {
  render(<PrivacyPage />);
  expect(screen.getByRole("heading", { level: 1, name: "개인정보처리방침" })).toBeDefined();
  render(<TermsPage />);
  expect(screen.getByRole("heading", { level: 1, name: "이용약관" })).toBeDefined();
  render(<CustomerFooter />);
  expect(screen.getByRole("link", { name: "개인정보처리방침" }).getAttribute("href")).toBe("/privacy");
  expect(screen.getByRole("link", { name: "이용약관" }).getAttribute("href")).toBe("/terms");
});
