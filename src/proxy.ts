import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE } from "@/lib/session-cookie";

/**
 * Optimistic check only: no session cookie → /login, remembering where the user
 * was going. Pages, actions and route handlers validate the session for real.
 */
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/login" || pathname.startsWith("/login/")) return NextResponse.next();

  if (request.cookies.has(SESSION_COOKIE)) {
    // Lets server components send users back here after onboarding.
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-pathname", `${pathname}${search}`);
    return NextResponse.next({ request: { headers: requestHeaders } });
  }

  const url = request.nextUrl.clone();
  url.pathname = "/login";
  url.search = "";
  if (pathname !== "/") url.searchParams.set("callbackUrl", `${pathname}${search}`);
  return NextResponse.redirect(url);
}

export const config = {
  // Everything except Next internals and static files.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon|apple-icon|manifest|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)"],
};
