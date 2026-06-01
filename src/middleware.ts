import { type NextRequest, NextResponse } from "next/server";
import { updateSession } from "@/shared/lib/supabase/middleware";

export async function middleware(request: NextRequest) {
  // Skip Supabase session for public game routes
  const path = request.nextUrl.pathname;
  if (path === "/" || path.startsWith("/game") || path.startsWith("/api/game")) {
    return NextResponse.next();
  }
  return await updateSession(request);
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * Feel free to modify this pattern to include more paths.
     */
    "/((?!_next/static|_next/image|favicon.ico|game|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
