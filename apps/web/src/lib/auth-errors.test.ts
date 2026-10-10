import { expect, test } from "vitest";
import { AUTH_ERROR_MESSAGES, authErrorCode } from "./auth-errors";

test("known Supabase codes map to specific page messages; unknown ones fall back", () => {
  expect(authErrorCode("email_address_not_authorized")).toBe("email-not-authorized");
  expect(authErrorCode("over_email_send_rate_limit")).toBe("rate-limited");
  expect(authErrorCode("user_already_exists")).toBe("exists");
  expect(authErrorCode("something_new")).toBe("unavailable");
  expect(authErrorCode(undefined)).toBe("unavailable");
  for (const code of ["email-not-authorized", "rate-limited", "exists", "email-invalid", "unavailable"]) {
    expect(AUTH_ERROR_MESSAGES[code]).toBeTruthy();
  }
});
