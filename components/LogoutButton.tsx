"use client";


import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LogoutButton() {
  const supabase = createSupabaseBrowserClient();

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/signup";
  }

  return (
    <button
      type="button"
      onClick={handleLogout}
      style={{
        padding: "8px 14px",
        borderRadius: 999,
        border: "1px solid rgba(0,0,0,0.08)",
        background: "#fff",
        color: "#1c1917",
        fontWeight: 600,
        cursor: "pointer",
        fontSize: 14,
      }}
    >
      Logout
    </button>
  );
}
