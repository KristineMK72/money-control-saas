import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  // --- 1. INITIAL RESPONSE (required for Supabase SSR cookie hydration)
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  // --- 2. CREATE SUPABASE CLIENT (your original logic)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            req.cookies.set(name, value);
          });

          response = NextResponse.next({
            request: {
              headers: req.headers,
            },
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // --- 3. HYDRATE SESSION
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const url = req.nextUrl.clone();
  const path = url.pathname;

  // --- 4. PUBLIC ROUTES (no auth required)
  const publicRoutes = [
    "/",
    "/signup",
    "/login",
    "/onboarding",
    "/onboarding/guide",
    "/upgrade",
    "/api",
  ];

  const isPublic = publicRoutes.some((p) => path.startsWith(p));

  // --- 5. IF NOT LOGGED IN → ALLOW PUBLIC, REDIRECT PRIVATE
  if (!user) {
    if (!isPublic) {
      url.pathname = "/signup";
      return NextResponse.redirect(url);
    }
    return response;
  }

  // --- 6. ONBOARDING CHECK
  const { data: profile } = await supabase
    .from("user_profile")
    .select("primary_stressor, primary_goal, ben_voice")
    .eq("user_id", user.id)
    .maybeSingle();

  const onboardingComplete =
    profile?.primary_stressor &&
    profile?.primary_goal &&
    profile?.ben_voice;

  if (!onboardingComplete && !path.startsWith("/onboarding")) {
    url.pathname = "/onboarding";
    return NextResponse.redirect(url);
  }

  // --- 7. PREMIUM GATING
  const premiumRoutes = ["/forecast", "/analytics", "/chat/premium"];

  const isPremiumRoute = premiumRoutes.some((p) =>
    path.startsWith(p)
  );

  if (isPremiumRoute) {
    const { data: sub } = await supabase
      .from("user_subscriptions")
      .select("status")
      .eq("user_id", user.id)
      .maybeSingle();

    const active = sub?.status === "active";

    if (!active) {
      url.pathname = "/upgrade";
      return NextResponse.redirect(url);
    }
  }

  // --- 8. DEFAULT: ALLOW REQUEST
  return response;
}

// --- 9. MATCHER (same as your original)
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
