import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";

// Fast redirect for signed-out visitors. Authorization itself is enforced by Spring on every API call.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login" || request.cookies.has(SESSION_COOKIE)) return NextResponse.next();
  const login = new URL(pathname.startsWith("/admin") ? "/admin/login" : "/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/reservations/:path*", "/popups/:popupId/reserve", "/admin/:path*"],
};
