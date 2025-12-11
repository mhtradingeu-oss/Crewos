import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const TOKEN_COOKIE = "mh_os_token";

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (pathname.startsWith("/admin")) {
    const token = req.cookies.get(TOKEN_COOKIE)?.value;
    if (!token) {
      const destination = req.nextUrl.clone();
      destination.pathname = "/login";
      destination.searchParams.set("returnTo", pathname);
      return NextResponse.redirect(destination);
    }
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin", "/admin/:path*"],
};
