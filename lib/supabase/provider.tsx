"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "./client";

const SupabaseContext = createContext<any>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data } = await supabase.auth.getSession();
      if (!mounted) return;

      const s = data.session;
      setSession(s);

      const user = s?.user;

      // Unified, future‑proof user ID extraction
      const uid =
        user?.id ||
        user?.user_id ||
        user?.sub ||
        user?.identities?.[0]?.user_id ||
        null;

      setUserId(uid);
      setHydrated(true);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, s) => {
        setSession(s);

        const user = s?.user;

        const uid =
          user?.id ||
          user?.user_id ||
          user?.sub ||
          user?.identities?.[0]?.user_id ||
          null;

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
