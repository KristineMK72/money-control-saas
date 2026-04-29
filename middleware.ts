import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { pathname } = req.nextUrl;

  /* ─────────────────────────────
     1. PUBLIC ROUTES (skip auth)
  ───────────────────────────── */
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
  ];

  if (publicRoutes.includes(pathname)) {
    return res;
  }

  /* ─────────────────────────────
     2. GET USER SESSION
  ───────────────────────────── */
  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const userId = session.user.id;

  /* ─────────────────────────────
     3. FETCH PROFILE (SAFE)
     IMPORTANT: use ONE table only
  ───────────────────────────── */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_complete, is_premium")
    .eq("id", userId)
    .maybeSingle();

  /* ─────────────────────────────
     4. ONBOARDING GUARD
  ───────────────────────────── */

  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // If no profile → force onboarding
  if (!profile && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // If profile exists but onboarding incomplete → force onboarding
  if (profile && !profile.onboarding_complete && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // Prevent onboarding loop
  if (isOnboardingRoute) {
    return res;
  }

  /* ─────────────────────────────
     5. PREMIUM ROUTES
  ───────────────────────────── */
  const premiumRoutes = [
    "/forecast",
    "/analytics",
    "/chat/premium",
    "/credit",
    "/credit/disputes",
    "/credit/templates",
    "/credit/builder",
  ];

  const isPremiumRoute = premiumRoutes.some((r) =>
    pathname.startsWith(r)
  );

  if (isPremiumRoute && !profile?.is_premium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  /* ─────────────────────────────
     6. DEFAULT ALLOW
  ───────────────────────────── */
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|static|public|favicon.ico|manifest.json|images|api|auth|login|signup).*)",
  ],
};
