import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

  // PUBLIC ROUTES (no auth required)
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
  ];

  if (publicRoutes.includes(pathname)) {
    return res;
  }

  // STATIC ASSETS
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp")
  ) {
    return res;
  }

  // API ROUTES
  if (pathname.startsWith("/api")) {
    return res;
  }

  // REQUIRE SESSION FOR APP ROUTES
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // LOAD PROFILE (supports both id and user_id columns)
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`)
    .single();

  // NO PROFILE → SEND TO ONBOARDING
  if (!profile) {
    if (!pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return res;
  }

  // ONBOARDING GATING
  if (!profile.onboarding_complete && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // PREMIUM ROUTES
  const premiumRoutes = [
    "/forecast",
    "/analytics",
    "/chat/premium",
    "/credit",
    "/credit/disputes",
    "/credit/templates",
    "/credit/builder",
  ];

  if (premiumRoutes.some((route) => pathname.startsWith(route))) {
    if (!profile.is_premium) {
      return NextResponse.redirect(new URL("/upgrade", req.url));
    }
  }

  return res;
}

export const config = {
  matcher: [
    "/((?!_next|static|public|favicon.ico|manifest.json|images|api|auth|login|signup|$).*)",
  ],
};
