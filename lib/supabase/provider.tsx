"use client";

import { createContext, useContext, useState } from "react";
import { Session, SupabaseClient } from "@supabase/supabase-js";
import { createSupabaseBrowserClient } from "./browser";

type SupabaseContextType = {
  supabase: SupabaseClient;
  session: Session | null;
};

const SupabaseContext = createContext<SupabaseContextType | undefined>(
  undefined
);

export function SupabaseProvider({
  children,
  initialSession = null,
}: {
  children: React.ReactNode;
  initialSession?: Session | null; // ⭐ optional + nullable
}) {
  const [supabase] = useState(() => createSupabaseBrowserClient());
  const [session] = useState<Session | null>(initialSession);

  return (
    <SupabaseContext.Provider value={{ supabase, session }}>
      {children}
    </SupabaseContext.Provider>
  );
}

export function useSupabase() {
  const ctx = useContext(SupabaseContext);
  if (!ctx) {
    throw new Error("useSupabase must be used inside SupabaseProvider");
  }
  return ctx;
}
