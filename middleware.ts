import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

// =========================
// STATIC BLOCK LIST
// =========================
const blockedIPs = ["18.144.7.244", "3.101.150.105"];

const publicRoutes = ["/", "/login", "/signup", "/auth/callback"];

const premiumRoutes = ["/forecast", "/analytics", "/chat/premium", "/credit"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // =========================
  // SKIP STATIC FILES EARLY
  // =========================
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/backgrounds/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  // =========================
  // IP BLOCKING
  // =========================
  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  if (blockedIPs.includes(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // =========================
  // PUBLIC ROUTES
  // =========================
  const isPublic =
    publicRoutes.includes(pathname) || pathname.startsWith("/api/");

  if (isPublic) {
    return NextResponse.next();
  }

  // =========================
  // SUPABASE CLIENT
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
  // AUTH CHECK
  // =========================
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    res.redirect(new URL("/login", req.url));
    return res; // <-- CRITICAL FIX
  }

  // =========================
  // PROFILE CHECK
  // =========================
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  const isOnboarding = pathname.startsWith("/onboarding");

  // =========================
  // ONBOARDING FLOW
  // =========================
  if (!profile?.onboarding_complete && !isOnboarding) {
    res.redirect(new URL("/onboarding", req.url));
    return res;
  }

  if (profile?.onboarding_complete && isOnboarding) {
    res.redirect(new URL("/dashboard", req.url));
    return res;
  }

  // =========================
  // PREMIUM GATE
  // =========================
  const isPremiumRoute = premiumRoutes.some((r) =>
    pathname.startsWith(r)
  );

  if (isPremiumRoute && !profile?.is_premium) {
    res.redirect(new URL("/upgrade", req.url));
    return res;
  }

  return res;
}

// =========================
// FIXED MATCHER
// =========================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|icons|backgrounds|.*\\.png$|.*\\.jpg$).*)",
  ],
};
