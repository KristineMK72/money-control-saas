import { createClient, SupabaseClient } from "@supabase/supabase-js";

function ensureEnv(name: string, val?: string): string {
  if (!val) throw new Error(`Missing required env variable: ${name}`);
  return val;
}

const NEXT_PUBLIC_SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const NEXT_PUBLIC_SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabase = (() => {
  const url = ensureEnv("NEXT_PUBLIC_SUPABASE_URL", NEXT_PUBLIC_SUPABASE_URL);
  const anon = ensureEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", NEXT_PUBLIC_SUPABASE_ANON_KEY);

  if ((globalThis as any).__supabase_client) {
    return (globalThis as any).__supabase_client as SupabaseClient;
  }

  const client = createClient(url, anon);
  (globalThis as any).__supabase_client = client;
  return client;
})();

export function createServerSupabaseClient({
  supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL,
  supabaseKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY ??
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}: {
  supabaseUrl?: string;
  supabaseKey?: string;
} = {}) {
  const url = ensureEnv("SUPABASE_URL", supabaseUrl);
  const key = ensureEnv("SUPABASE_KEY", supabaseKey);

  return createClient(url, key);
}
