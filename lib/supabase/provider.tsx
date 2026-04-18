"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "./client";

const SupabaseContext = createContext<any>(null);

export function SupabaseProvider({ children }: { children: React.ReactNode }) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session, setSession] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setSession(session);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, [supabase]);

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  return useContext(SupabaseContext);
}
