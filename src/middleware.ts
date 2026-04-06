import { auth0 } from "@/lib/auth0";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(request: NextRequest) {
  // Only let Auth0 handle /auth/* routes
  if (request.nextUrl.pathname.startsWith("/auth/")) {
    return await auth0.middleware(request);
  }

  // All other routes pass through
  return NextResponse.next();
}

export const config = {
  matcher: [
    "/auth/:path*",
    "/api/:path*",
  ],
};
