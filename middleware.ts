import { NextResponse } from "next/server";
import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // IMPORTANT: clone the request URL
  const res = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabase = createMiddlewareClient({ req, res });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  const pathname = req.nextUrl.pathname;

  // PUBLIC ROUTES
  const publicRoutes = ["/", "/login", "/signup", "/auth/callback"];
  if (publicRoutes.includes(pathname)) return res;

  // STATIC + API
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname.startsWith("/public") ||
    pathname.startsWith("/images") ||
    pathname.startsWith("/favicon") ||
    pathname.startsWith("/api") ||
    pathname.endsWith(".png") ||
    pathname.endsWith(".jpg") ||
    pathname.endsWith(".jpeg") ||
    pathname.endsWith(".svg") ||
    pathname.endsWith(".webp")
  ) {
    return res;
  }

  // REQUIRE LOGIN
  if (!session) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // LOAD PROFILE
  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .or(`id.eq.${session.user.id},user_id.eq.${session.user.id}`)
    .maybeSingle();

  if (!profile) {
    if (!pathname.startsWith("/onboarding")) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    return res;
  }

  if (!profile.onboarding_complete && !pathname.startsWith("/onboarding")) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

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
    "/((?!_next|static|public|favicon.ico|manifest.json|images|api|login|signup|$).*)",
  ],
};
