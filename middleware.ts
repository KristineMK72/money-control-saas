import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// =========================
// CONFIG
// =========================

const blockedIPs = new Set([
  "18.144.7.244",
  "3.101.150.105",
]);

const publicRoutes = new Set([
  "/",
  "/login",
  "/signup",
  "/auth/callback",
]);

const premiumRoutes = [
  "/forecast",
  "/analytics",
  "/chat/premium",
  "/credit",
];

// =========================
// MIDDLEWARE
// =========================

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // =========================
  // 1. SKIP STATIC FILES
  // =========================
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/backgrounds/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico|txt)$/)
  ) {
    return NextResponse.next();
  }

  // =========================
  // 2. BLOCKED IPS
  // =========================
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown";

  if (blockedIPs.has(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // =========================
  // 3. PUBLIC ROUTES (NO AUTH REQUIRED)
  // =========================
  const isPublic =
    publicRoutes.has(pathname) || pathname.startsWith("/api/");

  if (isPublic) {
    return NextResponse.next();
  }

  // =========================
  // 4. SUPABASE CLIENT
  // =========================
  const res = NextResponse.next();

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll: () => req.cookies.getAll(),
        setAll: (cookies) => {
          cookies.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // =========================
  // 5. AUTH CHECK
  // =========================
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // 6. PROFILE CHECK (SAFE)
  // =========================
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  const onboardingComplete = profile?.onboarding_complete ?? false;
  const isPremium = profile?.is_premium ?? false;

  const isOnboarding = pathname.startsWith("/onboarding");

  // =========================
  // 7. ONBOARDING FLOW
  // =========================

  if (!onboardingComplete && !isOnboarding) {
    return NextResponse.redirect(
      new URL("/onboarding", req.url)
    );
  }

  if (onboardingComplete && isOnboarding) {
    return NextResponse.redirect(
      new URL("/dashboard", req.url)
    );
  }

  // =========================
  // 8. PREMIUM ROUTES
  // =========================
  const isPremiumRoute = premiumRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPremiumRoute && !isPremium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  // =========================
  // 9. CONTINUE REQUEST
  // =========================
  return res;
}

// =========================
// MATCHER
// =========================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
};
