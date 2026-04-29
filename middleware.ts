import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

export async function middleware(req: NextRequest) {
  let res = NextResponse.next({ request: req });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            req.cookies.set(name, value)
          );
          res = NextResponse.next({ request: req });
          cookiesToSet.forEach(({ name, value, options }) =>
            res.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const { pathname } = req.nextUrl;

  /* 1. PUBLIC ROUTES (skip auth) */
  const publicRoutes = ["/", "/login", "/signup", "/auth/callback"];
  if (publicRoutes.includes(pathname)) {
    // Still call getUser() so the cookie is refreshed even on public pages
    await supabase.auth.getUser();
    return res;
  }

  /* 2. GET USER */
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* 3. FETCH PROFILE */
  const { data: profile } = await supabase
    .from("profiles")
    .select("id, onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  /* 4. ONBOARDING GUARD */
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (!profile && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  if (profile && !profile.onboarding_complete && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  if (isOnboardingRoute) {
    return res;
  }

  /* 5. PREMIUM ROUTES */
  const premiumRoutes = [
    "/forecast",
    "/analytics",
    "/chat/premium",
    "/credit",
    "/credit/disputes",
    "/credit/templates",
    "/credit/builder",
  ];
  const isPremiumRoute = premiumRoutes.some((r) => pathname.startsWith(r));
  if (isPremiumRoute && !profile?.is_premium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  /* 6. DEFAULT ALLOW */
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|static|public|favicon.ico|manifest.json|images|api|auth|login|signup).*)",
  ],
};
