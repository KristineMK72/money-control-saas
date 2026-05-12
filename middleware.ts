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
  // SKIP STATIC FILES EARLY (IMPORTANT)
  // =========================
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/backgrounds/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname.match(/\.(svg|png|jpg|jpeg|gif|webp|ico)$/)
  ) {
    return NextResponse.next();
  }

  const ip = req.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";

  if (blockedIPs.includes(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  // =========================
  // PUBLIC ROUTES EARLY EXIT
  // =========================
  const isPublic =
    publicRoutes.includes(pathname) || pathname.startsWith("/api/");

  if (isPublic) {
    return NextResponse.next();
  }

  // =========================
  // SUPABASE CLIENT (ONLY WHEN NEEDED)
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
    return NextResponse.redirect(new URL("/login", req.url));
  }

  // =========================
  // PROFILE CHECK
  // =========================
  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("id", user.id)
    .maybeSingle();

  // =========================
  // ONBOARDING FLOW
  // =========================
  const isOnboarding = pathname.startsWith("/onboarding");

  if (!profile?.onboarding_complete && !isOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (profile?.onboarding_complete && isOnboarding) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  // =========================
  // PREMIUM GATE
  // =========================
  const isPremiumRoute = premiumRoutes.some((r) =>
    pathname.startsWith(r)
  );

  if (isPremiumRoute && !profile?.is_premium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
