import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const SESSION_COOKIE_NAME =
  process.env.SESSION_COOKIE_NAME ??
  process.env.NEXT_PUBLIC_SESSION_COOKIE_NAME ??
  "marconi_session";
const API_BASE = process.env.NEXT_PUBLIC_API_URL;

function isProtectedPath(pathname: string): boolean {
  return (
    pathname.startsWith("/admin") ||
    pathname.startsWith("/staff") ||
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/superadmin")
  );
}

function canEnforceCookieGuard(request: NextRequest): boolean {
  if (!API_BASE) return true;

  try {
    const apiHost = new URL(API_BASE).hostname;
    return apiHost === request.nextUrl.hostname;
  } catch {
    return true;
  }
}

export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;

  if (!isProtectedPath(pathname)) {
    return NextResponse.next();
  }

  if (!canEnforceCookieGuard(request)) {
    return NextResponse.next();
  }

  const sessionCookie = request.cookies.get(SESSION_COOKIE_NAME);
  if (sessionCookie?.value) {
    return NextResponse.next();
  }

  const loginUrl = new URL("/login", request.url);
  const nextPath = `${pathname}${search}`;
  if (nextPath && nextPath !== "/") {
    loginUrl.searchParams.set("next", nextPath);
  }

  return NextResponse.redirect(loginUrl);
}

export const config = {
  matcher: ["/admin/:path*", "/staff/:path*", "/dashboard/:path*", "/superadmin/:path*"],
};
