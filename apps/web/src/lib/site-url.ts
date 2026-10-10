/**
 * Public origin used in emailed links. Taken from configuration only: request Host/X-Forwarded-* headers can be forged,
 * which would send Supabase confirmation codes to another domain. Production must set NEXT_PUBLIC_SITE_URL.
 */
export function siteUrl(env: Record<string, string | undefined> = process.env): string | null {
  const configured = env.NEXT_PUBLIC_SITE_URL?.trim();
  if (configured) {
    try {
      const url = new URL(configured);
      const local = url.hostname === "localhost" || url.hostname === "127.0.0.1";
      // Auth codes ride on this origin: plain HTTP only for a local machine, even in a production build.
      if (url.protocol === "https:" || (url.protocol === "http:" && (local || env.NODE_ENV !== "production"))) return url.origin;
    } catch {
      return null;
    }
    return null;
  }
  return env.NODE_ENV === "production" ? null : "http://localhost:3000";
}
