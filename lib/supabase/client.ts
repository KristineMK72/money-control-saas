"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * REAL Supabase browser client.
 * No fallbacks — must use real env vars.
 */
export function createSupabaseBrowserClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );
}
