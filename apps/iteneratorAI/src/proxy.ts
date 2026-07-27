import { getToken } from "next-auth/jwt";
import { NextRequest, NextResponse } from "next/server";

// want to construct a middleware where it checks what route am i at , with getcurrent url or something , and according to that it checks cookies etc , and then decide that if we should
// let it be acccessed or not
//

export async function proxy(request: NextRequest) {
  const token = await getToken({ req: request });
  const url = request.nextUrl;
  const startsWith = (pathName: string) => {
    return url.pathname.startsWith(pathName);
  };

  if (token?.id) {
    if (startsWith("/app")) {
      return NextResponse.next();
    } else {
      return NextResponse.redirect(new URL("/app/dashboard", request.nextUrl));
    }
  } else {
    if (startsWith("/app")) {
      return NextResponse.redirect(new URL("/signin", request.nextUrl));
    }
  }
}
export const config = {
  matcher: ["/app/:path*", "/signin"],
};

// /app for protected pages
// /v1/app for protected endpoints
// currently only one public page which is signin
// public endpoints are the auth endpoints
// /api/auth is handled by next-auth

// ended up deciding that middleware should just be for pages only.
