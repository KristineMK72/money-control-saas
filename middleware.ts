import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/manifest.json",
  ];

  if (publicRoutes.includes(pathname)) {
    return res;
  }

  // Allow all API routes
  if (pathname.startsWith("/api")) {
    return res;
  }

  // Allow static assets
  if (
    pathname.startsWith("/images") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static")
  ) {
    return res;
  }

  // Require session
  if (!session) {
    return NextResponse.redirect(new URL("/signup", req.url));
  }

  // Load profile
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", session.user.id)
    .single();

  // Onboarding gating
  if (!profile?.onboarding_complete && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding/start", req.url));
  }

  // Premium gating
  const premiumRoutes = ["/forecast", "/analytics", "/chat/premium"];
  if (premiumRoutes.some((route) => pathname.startsWith(route))) {
    if (!profile?.is_premium) {
      return NextResponse.redirect(new URL("/upgrade", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|static|public|favicon.ico|manifest.json|images|auth|login|signup|api).*)",
  ],
};
