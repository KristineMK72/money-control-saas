import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function GET() {
  const cookieStore = await cookies();
  const allCookies = cookieStore.getAll().map(c => ({
    name: c.name,
    valueLength: c.value.length,
    valuePreview: c.value.slice(0, 30),
  }));
  const sbCookies = allCookies.filter(c => c.name.startsWith("sb-"));

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getUser();

  return NextResponse.json({
    user: data?.user?.id ?? null,
    email: data?.user?.email ?? null,
    error: error?.message ?? null,
    supabaseUrl: process.env.NEXT_PUBLIC_SUPABASE_URL ?? null,
    hasAnonKey: !!process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    sbCookieCount: sbCookies.length,
    sbCookies,
    allCookieNames: allCookies.map(c => c.name),
  });
}
