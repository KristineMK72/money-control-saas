"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "./client";

const SupabaseContext = createContext<any>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  // ⭐ Helper to safely extract user ID from any Supabase version
  function extractUserId(user: any): string | null {
    if (!user) return null;

    return (
      user.id ||
      user.user_id ||
      user.sub ||
      user?.identities?.[0]?.user_id ||
      null
    );
  }

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const s = data.session;
      setSession(s);

      const uid = extractUserId(s?.user);
      setUserId(uid);

      setHydrated(true);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);

        const uid = extractUserId(s?.user);
        setUserId(uid);
      }
    );

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, session, userId, hydrated }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
