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

  // 🔍 LOG every request the middleware sees
  const sbCookies = req.cookies.getAll().filter(c => c.name.startsWith("sb-")).map(c => c.name);
  console.log(`[mw] ${pathname} | sb-cookies: ${sbCookies.length ? sbCookies.join(",") : "NONE"}`);

  /* 1. PUBLIC ROUTES */
  const publicRoutes = ["/", "/login", "/signup", "/auth/callback"];
  if (publicRoutes.includes(pathname)) {
    await supabase.auth.getUser();
    return res;
  }

  /* 2. GET USER */
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser();

  console.log(`[mw] ${pathname} | user: ${user?.id ?? "NULL"} | err: ${userError?.message ?? "none"}`);

  if (!user) {
    console.log(`[mw] ${pathname} | REDIRECT → /login (no user)`);
    return NextResponse.redirect(new URL("/login", req.url));
  }

  /* 3. PROFILE */
  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("id, onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  console.log(`[mw] ${pathname} | profile: ${profile ? JSON.stringify(profile) : "NULL"} | err: ${profileError?.message ?? "none"}`);

  /* 4. ONBOARDING GUARD */
  const isOnboardingRoute = pathname.startsWith("/onboarding");

  if (!profile && !isOnboardingRoute) {
    console.log(`[mw] ${pathname} | REDIRECT → /onboarding (no profile)`);
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  if (profile && !profile.onboarding_complete && !isOnboardingRoute) {
    console.log(`[mw] ${pathname} | REDIRECT → /onboarding (incomplete)`);
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }
  if (isOnboardingRoute) {
    return res;
  }

  /* 5. PREMIUM */
  const premiumRoutes = [
    "/forecast", "/analytics", "/chat/premium",
    "/credit", "/credit/disputes", "/credit/templates", "/credit/builder",
  ];
  const isPremiumRoute = premiumRoutes.some((r) => pathname.startsWith(r));
  if (isPremiumRoute && !profile?.is_premium) {
    console.log(`[mw] ${pathname} | REDIRECT → /upgrade (not premium)`);
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  console.log(`[mw] ${pathname} | ALLOW`);
  return res;
}

export const config = {
  matcher: [
    "/((?!_next|static|public|favicon.ico|manifest.json|images|api|auth|login|signup).*)",
  ],
};
