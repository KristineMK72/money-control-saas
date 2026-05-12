"use client";

import { createBrowserClient } from "@supabase/ssr";

/**
 * Non-empty fallbacks so `next build` can prerender without Supabase env vars.
 * Production deployments must set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.
 */
function supabaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_URL || "https://placeholder.supabase.co"
  );
}

function supabaseAnonKey(): string {
  return (
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJyb2xlIjoiYW5vbiJ9.placeholder"
  );
}

export function createSupabaseBrowserClient() {
  return createBrowserClient(supabaseUrl(), supabaseAnonKey());
}
