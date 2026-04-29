'use client'

import {
  createClientComponentClient,
  type SupabaseClient,
} from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/supabase-js'
import { createContext, useContext, useState } from 'react'

type SupabaseContextType = {
  supabase: SupabaseClient
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: Session | null
}) {
  const [supabase] = useState(() =>
    createClientComponentClient({ initialSession })
  )

  return (
    <SupabaseContext.Provider value={{ supabase }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return ctx.supabase
}
