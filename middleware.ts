import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();
  const supabase = createMiddlewareClient({ req, res });

  // Load session
  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // Public routes
  const publicRoutes = ["/", "/login", "/signup", "/auth/callback"];
  if (publicRoutes.includes(pathname)) return res;

  // Require login
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // Load profile
  const { data: profile } = await supabase
    .from("user_profile")
    .select("*")
    .eq("user_id", session.user.id)
    .maybeSingle();

  // If no profile yet → onboarding
  if (!profile && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // If onboarding not complete → force onboarding
  if (profile && !profile.onboarding_complete) {
    if (!pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
  }

  // Premium gating
  const premiumRoutes = [
    "/forecast",
    "/analytics",
    "/chat/premium",
    "/credit",
    "/credit/disputes",
    "/credit/templates",
    "/credit/builder",
  ];

  if (premiumRoutes.some((r) => pathname.startsWith(r))) {
    if (!profile?.is_premium) {
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
