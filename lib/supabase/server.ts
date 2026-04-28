// lib/supabase/server.ts
export async function createSupabaseServerClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll() },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) =>
              // Add domain: '.askben.buzz' to share between www and root
              cookieStore.set(name, value, { ...options, domain: '.askben.buzz' })
            )
          } catch { /* ignore */ }
        },
      },
    }
  )
}
