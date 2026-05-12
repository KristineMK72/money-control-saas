import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const blockedIPs = ["18.144.7.244", "3.101.150.105"];

const publicRoutes = [
  "/",
  "/login",
  "/signup",
  "/auth/callback",
];

const premiumRoutes = [
  "/forecast",
  "/analytics",
  "/chat/premium",
  "/credit",
];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // 1. ALLOW STATIC ASSETS & IMAGE FILES IMMEDIATELY
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

  // 2. IP BLOCKING
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
  if (blockedIPs.includes(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // 3. PUBLIC ROUTE CHECK
  // We do this before Supabase to avoid unnecessary DB calls/redirects during build
  const isPublic = publicRoutes.includes(pathname) || pathname.startsWith("/api/");
  if (isPublic) {
    return NextResponse.next();
  }

  // 4. INITIALIZE SUPABASE CLIENT
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

  // 5. SESSION CHECK
  const { data: { user } } = await supabase.auth.getUser();

  // If no user and not on a public route, send to login
  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // 6. PROFILE & REDIRECT LOGIC
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  const isOnboardingPath = pathname.startsWith("/onboarding");

  // Handle Onboarding Redirects
  if (!profile?.onboarding_complete) {
    // If onboarding is NOT complete and user isn't there, send them there
    if (!isOnboardingPath) {
      return NextResponse.redirect(new URL("/onboarding", req.url));
    }
    // If they are on /onboarding, let them stay
    return res;
  } 
  
  // If onboarding IS complete but user tries to go to /onboarding, send to dashboard
  if (profile?.onboarding_complete && isOnboardingPath) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // 7. PREMIUM ACCESS CHECK
  const isUpgradePath = pathname === "/upgrade";
  const isPremiumRoute = premiumRoutes.some((r) => pathname.startsWith(r));

  // If user hits a premium route but isn't premium, send to upgrade
  if (isPremiumRoute && !profile?.is_premium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  // If user is ALREADY on /upgrade or /dashboard (or any other general route), let them through
  return res;
}

// Ensure the matcher doesn't accidentally block the login/signup routes 
// which are handled by the logic above.
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json).*)",
  ],
};
