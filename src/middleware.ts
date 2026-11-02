import { NextResponse, type NextRequest } from "next/server";

import { adminHost, isAdminHost, requestHost } from "~/lib/hosts";

export function middleware(request: NextRequest) {
  const host = requestHost(request.headers);
  const url = request.nextUrl.clone();

  if (isAdminHost(host)) {
    if (url.pathname === "/") {
      url.pathname = "/inventory";
      return NextResponse.redirect(url);
    }
    url.pathname = `/admin${url.pathname}`;
    return NextResponse.rewrite(url);
  }

  if (url.pathname === "/admin" || url.pathname.startsWith("/admin/")) {
    url.host = adminHost(host);
    url.pathname = url.pathname.slice("/admin".length) || "/";
    return NextResponse.redirect(url);
  }
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|.*\\..*).*)"],
};
