import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const sbCookie = cookieStore.getAll().find(c => c.name.startsWith("sb-") && c.name.endsWith("-auth-token"));

  let parsed: any = null;
  let parseError: string | null = null;
  let accessTokenLen = 0;
  let refreshTokenLen = 0;
  let expiresAt: number | null = null;
  let nowSec = Math.floor(Date.now() / 1000);

  if (sbCookie) {
    try {
      const raw = sbCookie.value.startsWith("base64-")
        ? Buffer.from(sbCookie.value.slice(7), "base64").toString("utf-8")
        : sbCookie.value;
      parsed = JSON.parse(raw);
      accessTokenLen = parsed?.access_token?.length ?? 0;
      refreshTokenLen = parsed?.refresh_token?.length ?? 0;
      expiresAt = parsed?.expires_at ?? null;
    } catch (e: any) {
      parseError = e.message;
    }
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    user: data?.user?.id ?? null,
    error: error?.message ?? null,
    cookieFound: !!sbCookie,
    cookieValuePrefix: sbCookie?.value.slice(0, 12) ?? null,
    parseError,
    accessTokenLen,
    refreshTokenLen,
    expiresAt,
    nowSec,
    expired: expiresAt ? expiresAt < nowSec : null,
  });
}
