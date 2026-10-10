import { expect, test } from "vitest";
import { enabledProviders, isOAuthProvider, kakaoScopes, oauthRedirectTo } from "./oauth";

test("only known providers listed in AUTH_PROVIDERS are enabled, in order, without duplicates", () => {
  expect(enabledProviders({})).toEqual([]);
  expect(enabledProviders({ AUTH_PROVIDERS: " Google, kakao ,google, github, " })).toEqual(["google", "kakao"]);
  expect(isOAuthProvider("toString")).toBe(false);
  expect(isOAuthProvider("kakao")).toBe(true);
});

test("redirect goes to our callback on the configured site with an encoded next path", () => {
  expect(oauthRedirectTo("https://popspot.example", "/popups/3/reserve?slotId=9")).toBe(
    "https://popspot.example/auth/callback?next=%2Fpopups%2F3%2Freserve%3FslotId%3D9",
  );
});

test("kakao requests profile-only scopes when the app cannot receive email", () => {
  expect(kakaoScopes({})).toBeUndefined();
  expect(kakaoScopes({ AUTH_KAKAO_WITHOUT_EMAIL: "true" })).toBe("profile_nickname profile_image");
});
