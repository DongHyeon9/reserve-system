import { expect, test } from "vitest";
import { siteUrl } from "./site-url";

test("uses only the configured origin and never request headers", () => {
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "https://popspot.example/some/path", NODE_ENV: "production" })).toBe("https://popspot.example");
  expect(siteUrl({ NODE_ENV: "development" })).toBe("http://localhost:3000");
});

test("production without a valid configured origin refuses instead of guessing", () => {
  expect(siteUrl({ NODE_ENV: "production" })).toBeNull();
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "javascript:alert(1)", NODE_ENV: "production" })).toBeNull();
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "not a url", NODE_ENV: "development" })).toBeNull();
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "http://popspot.example", NODE_ENV: "production" })).toBeNull();
  expect(siteUrl({ NEXT_PUBLIC_SITE_URL: "http://localhost:3200", NODE_ENV: "production" })).toBe("http://localhost:3200");
});
