import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Public routes that should NEVER be blocked
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/manifest.json",
  ];

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return res;
  }

  // Allow all API routes (auth, webhooks, etc.)
  if (pathname.startsWith("/api")) {
    return res;
  }

  // If no session → redirect to signup
  if (!session) {
    return NextResponse.redirect(new URL("/signup", req.url));
  }

  // Load user profile for onboarding + premium gating
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", session.user.id)
    .single();

  // If onboarding incomplete → force onboarding
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

// Matcher: run middleware on everything EXCEPT auth, login, signup, static files, and API
export const config = {
  matcher: [
    "/((?!_next|static|favicon.ico|manifest.json|auth|login|signup|api).*)",
  ],
};
