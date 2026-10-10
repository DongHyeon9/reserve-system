import { NextResponse, type NextRequest } from "next/server";
import { devAuthEnabled } from "@/lib/dev-auth";
import { SESSION_COOKIE } from "@/lib/session";
import { updateSession } from "@/lib/supabase/proxy";

const PROTECTED = /^\/(reservations(\/|$)|popups\/[^/]+\/reserve$|admin(\/|$))/;

// Refreshes the Supabase session on every page request, then fast-redirects signed-out visitors away from
// protected pages. Authorization itself is enforced by Spring on every API call.
export async function proxy(request: NextRequest) {
  const { response, signedIn } = await updateSession(request);
  const { pathname, search } = request.nextUrl;
  const devSignedIn = devAuthEnabled() && request.cookies.has(SESSION_COOKIE);
  if (signedIn || devSignedIn || pathname === "/admin/login" || !PROTECTED.test(pathname)) return response;

  const login = new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", request.url);
  login.searchParams.set("next", pathname + search);
  const redirect = NextResponse.redirect(login);
  response.cookies.getAll().forEach((cookie) => redirect.cookies.set(cookie));
  return redirect;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
