import { NextResponse } from "next/server";
import { createRouteHandlerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");

  if (!code) {
    return NextResponse.redirect(
      new URL("/login?error=missing_auth_code", requestUrl.origin)
    );
  }

  const supabase = createRouteHandlerClient({ cookies });

  const { error } = await supabase.auth.exchangeCodeForSession(code);

  if (error) {
    console.error("Auth callback error:", error.message);

    return NextResponse.redirect(
      new URL(
        `/login?error=${encodeURIComponent(error.message)}`,
        requestUrl.origin
      )
    );
  }

  return NextResponse.redirect(new URL("/dashboard", requestUrl.origin));
}
