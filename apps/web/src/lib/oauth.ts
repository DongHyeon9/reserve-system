// Social sign-in providers shown on the login page. Enabled per environment with AUTH_PROVIDERS=google,kakao so a
// button only appears once the provider is configured in Supabase (see todo/04-social-login.html).
export const OAUTH_LABELS = { google: "Google로 계속하기", kakao: "카카오로 계속하기" } as const;
export type OAuthProvider = keyof typeof OAUTH_LABELS;

export function isOAuthProvider(value: unknown): value is OAuthProvider {
  return typeof value === "string" && Object.hasOwn(OAUTH_LABELS, value);
}

export function enabledProviders(env: Record<string, string | undefined> = process.env): OAuthProvider[] {
  const listed = (env.AUTH_PROVIDERS ?? "").split(",").map((p) => p.trim().toLowerCase());
  return [...new Set(listed.filter(isOAuthProvider))];
}

/** Where Supabase sends the user back after the provider: our PKCE callback on the configured site origin. */
export function oauthRedirectTo(site: string, next: string) {
  return `${site}/auth/callback?next=${encodeURIComponent(next)}`;
}

/** Kakao only shares email with business apps; without one, request profile scopes and let Supabase accept no email. */
export function kakaoScopes(env: Record<string, string | undefined> = process.env) {
  return env.AUTH_KAKAO_WITHOUT_EMAIL === "true" ? "profile_nickname profile_image" : undefined;
}
