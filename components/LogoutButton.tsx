"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const supabase = createSupabaseBrowserClient();
  const [authenticated, setAuthenticated] = useState<boolean | null>(null);

  useEffect(() => {
    void supabase.auth.getSession().then(({ data }) => setAuthenticated(!!data.session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setAuthenticated(!!session);
    });
    return () => subscription.unsubscribe();
  }, [supabase]);

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  if (authenticated === null) return null;

  if (!authenticated) {
    return (
      <a
        href="/login"
        style={{ padding: "11px 20px", borderRadius: 999, fontWeight: 800, fontSize: 15, color: "#fff", background: "rgba(5,5,8,0.8)", border: "1px solid rgba(255,255,255,0.2)", whiteSpace: "nowrap" }}
      >
        Login
      </a>
    );
  }

  return (
    <>
      <a
        href="/settings"
        aria-label="Settings"
        title="Settings"
        style={{ width: 48, height: 48, display: "grid", placeItems: "center", borderRadius: 16, background: "rgba(5,5,8,0.75)", border: "1px solid rgba(255,255,255,0.18)", fontSize: 21 }}
      >
        ⚙️
      </a>
      <button
        type="button"
        onClick={handleLogout}
        style={{ padding: "8px 14px", borderRadius: 999, border: "1px solid rgba(0,0,0,0.08)", background: "#fff", color: "#1c1917", fontWeight: 600, cursor: "pointer", fontSize: 14 }}
      >
        Logout
      </button>
    </>
  );
}
