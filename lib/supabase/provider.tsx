'use client'

import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/supabase-js'
import { useState } from 'react'

export function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: Session | null
}) {
  // Hydrate the client with the server session
  const [supabase] = useState(() =>
    createClientComponentClient({ initialSession })
  )

  return <>{children}</>
}
