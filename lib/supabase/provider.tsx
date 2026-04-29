'use client'

import {
  createClientComponentClient,
  type SupabaseClient,
} from '@supabase/auth-helpers-nextjs'
import { Session } from '@supabase/supabase-js'
import { createContext, useContext, useEffect, useState } from 'react'

type SupabaseContextType = {
  supabase: SupabaseClient
  session: Session | null
}

const SupabaseContext = createContext<SupabaseContextType | undefined>(undefined)

export function SupabaseProvider({
  children,
  initialSession,
}: {
  children: React.ReactNode
  initialSession: Session | null
}) {
  // ❗ Create client WITHOUT initialSession (your version doesn't support it)
  const [supabase] = useState(() => createClientComponentClient())

  // ⭐ Hydrate session manually
  const [session, setSession] = useState<Session | null>(initialSession)

  useEffect(() => {
    // Keep session in sync on client
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
    })

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, newSession) => {
      setSession(newSession)
    })

    return () => subscription.unsubscribe()
  }, [supabase])

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  )
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext)
  if (!ctx) {
    throw new Error('useSupabase must be used inside SupabaseProvider')
  }
  return ctx
}
