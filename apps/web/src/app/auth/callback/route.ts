import { NextResponse, type NextRequest } from "next/server";
import { safeNextPath } from "@/lib/session";
import { createClient } from "@/lib/supabase/server";

// Target of the sign-up confirmation email link: trades the one-time code for a session cookie.
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code");
  const next = safeNextPath(request.nextUrl.searchParams.get("next"));
  if (code) {
    const { error } = await (await createClient()).auth.exchangeCodeForSession(code);
    if (!error) return NextResponse.redirect(new URL(next, request.url));
  }
  return NextResponse.redirect(new URL(`/login?error=callback&next=${encodeURIComponent(next)}`, request.url));
}
