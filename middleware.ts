import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// =========================
// RATE LIMIT STORE
// =========================
const ipMap = new Map<string, { count: number; last: number }>();

const RATE_LIMIT = 25;
const WINDOW = 10 * 1000;

// =========================
// STATIC BLOCK LIST
// =========================
const blockedIPs = ["18.144.7.244", "3.101.150.105"];

// =========================
// SUSPICIOUS PATHS
// =========================
const suspiciousPaths = ["/api/v1/env", "/api/v2/config"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // =========================
  // EARLY ALLOW: STATIC + ASSETS
  // =========================
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/backgrounds/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/favicon.png" ||
    pathname.startsWith("/opengraph-image") ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // =========================
  // CREATE BASE RESPONSE
  // =========================
  const res = NextResponse.next();

  // =========================
  // IP + REQUEST INFO
  // =========================
  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  const ua = req.headers.get("user-agent") || "unknown";
  const path = req.nextUrl.pathname;
  const now = Date.now();

  // =========================
  // HARD BLOCK
  // =========================
  if (blockedIPs.includes(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // =========================
  // BLOCK SUSPICIOUS PATHS
  // =========================
  if (suspiciousPaths.includes(path)) {
    return new NextResponse("Blocked", { status: 403 });
  }

  // =========================
  // RATE LIMITING
  // =========================
  const record = ipMap.get(ip) || { count: 0, last: now };

  if (now - record.last > WINDOW) {
    record.count = 1;
    record.last = now;
  } else {
    record.count++;
  }

  ipMap.set(ip, record);

  if (record.count > RATE_LIMIT) {
    return new NextResponse("Too many requests", { status: 429 });
  }

  // =========================
  // SIMPLE BOT DETECTION
  // =========================
  const isBot = record.count > 15 && (!ua || ua.length < 20);

  if (isBot) {
    return new NextResponse("Bot blocked", { status: 403 });
  }

  // =========================
  // LOG EVENTS (NON-BLOCKING)
  // =========================
  if (!path.startsWith("/api/") && !path.includes(".")) {
    fetch(`${req.nextUrl.origin}/api/log-event`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ip, ua, path }),
    }).catch(() => {});
  }

  // =========================
  // SUPABASE SSR CLIENT
  // =========================
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return req.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  // =========================
  // PUBLIC ROUTES
  // =========================
  const publicRoutes = [
    "/",
    "/login",
    "/signup",
    "/auth/callback",
    "/onboarding",
  ];

  const isPublic =
    publicRoutes.includes(pathname) ||
    pathname.startsWith("/api/");

  if (isPublic) {
    return res;
  }

  // =========================
  // VERIFY USER SESSION
  // =========================
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // PROFILE LOOKUP
  // =========================
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  const isOnboardingRoute = pathname.startsWith("/onboarding");

  // =========================
  // ONBOARDING GATE
  // =========================
  if (profile?.onboarding_complete && isOnboardingRoute) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  if (profile && !profile.onboarding_complete && !isOnboardingRoute) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  // =========================
  // PREMIUM ROUTES
  // =========================
  const premiumRoutes = [
    "/forecast",
    "/analytics",
    "/chat/premium",
    "/credit",
  ];

  const isPremiumRoute = premiumRoutes.some((r) =>
    pathname.startsWith(r)
  );

  if (isPremiumRoute && !profile?.is_premium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/(.*)"],
};
