import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/** App routes that require a Supabase session (avoid /api — JSON routes must not redirect). */
const PROTECTED =
  /^\/(dashboard|spend|income|income-plan|bills|debt|payments|forecast|chat|calendar|crisis|credit-health|credit-recovery|goodwill-letter|dispute-letter)(\/|$)/i;

export async function middleware(req: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: req.headers,
    },
  });

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return response;
  }

  const supabase = createServerClient(
    supabaseUrl,
    supabaseAnonKey,
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

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const { pathname } = req.nextUrl;

  if (!pathname.startsWith("/api") && PROTECTED.test(pathname) && !user) {
    const url = req.nextUrl.clone();
    url.pathname = "/signup";
    url.searchParams.set("mode", "login");
    return NextResponse.redirect(url);
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Skip Next internals, common static files, and hashed assets so middleware
     * never blocks images, fonts, manifest, or service worker.
     */
    "/((?!_next/static|_next/image|favicon.ico|manifest.json|robots.txt|sw.js|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|json|txt|webmanifest|woff2?|ttf|eot)$).*)",
  ],
};
