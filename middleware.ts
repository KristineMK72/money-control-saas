import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  const { data: { session } } = await supabase.auth.getSession();
  const pathname = req.nextUrl.pathname;

  // Fully public routes
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
  ];

  // Allow public routes
  if (publicRoutes.includes(pathname)) {
    return res;
  }

  // Allow static assets
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

  // Allow API routes
  if (pathname.startsWith("/api")) {
    return res;
  }

  // Require session for everything else
  if (!session) {
    return NextResponse.redirect(new URL("/signup", req.url));
  }

  // Load profile for onboarding + premium gating
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

// Matcher: run middleware ONLY on real app routes
export const config = {
  matcher: [
    "/((?!_next|static|public|favicon.ico|manifest.json|images|api|auth|login|signup).*)",
  ],
};
