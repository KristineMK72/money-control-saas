import { NextResponse, type NextRequest } from "next/server";
import { createServerClient } from "@supabase/ssr";

const blockedIPs = new Set(["18.144.7.244", "3.101.150.105"]);

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

function isStaticAsset(pathname: string) {
  return (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/backgrounds/") ||
    pathname.startsWith("/images/") ||
    pathname.startsWith("/icons/") ||
    pathname === "/favicon.ico" ||
    pathname === "/manifest.json" ||
    /\.(svg|png|jpg|jpeg|gif|webp|ico|txt)$/.test(pathname)
  );
}

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  if (isStaticAsset(pathname)) {
    return NextResponse.next();
  }

  const ip =
    req.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";

  if (blockedIPs.has(ip)) {
    return new NextResponse("Forbidden", { status: 403 });
  }

  if (publicRoutes.has(pathname) || pathname.startsWith("/api/")) {
    return NextResponse.next();
  }

  let res = NextResponse.next({
    request: req,
  });

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

          res = NextResponse.next({
            request: req,
          });

          cookiesToSet.forEach(({ name, value, options }) => {
            res.cookies.set(name, value, options);
          });
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.redirect(new URL("/login", req.url));
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("onboarding_complete, is_premium")
    .eq("user_id", user.id)
    .maybeSingle();

  const onboardingComplete = profile?.onboarding_complete ?? false;
  const isPremium = profile?.is_premium ?? false;
  const isOnboarding = pathname.startsWith("/onboarding");

  if (!onboardingComplete && !isOnboarding) {
    return NextResponse.redirect(new URL("/onboarding", req.url));
  }

  if (onboardingComplete && isOnboarding) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  const isPremiumRoute = premiumRoutes.some((route) =>
    pathname.startsWith(route)
  );

  if (isPremiumRoute && !isPremium) {
    return NextResponse.redirect(new URL("/upgrade", req.url));
  }

  return res;
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|manifest.json).*)"],
};
