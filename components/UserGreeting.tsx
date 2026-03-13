"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function UserGreeting() {
  const supabase = createSupabaseBrowserClient();
  const [name, setName] = useState<string>("");

  useEffect(() => {
    let mounted = true;

    async function loadName() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user || !mounted) return;

      const { data, error } = await supabase
        .from("profiles")
        .select("display_name")
        .eq("user_id", user.id)
        .maybeSingle();

      if (!mounted) return;
      if (!error && data?.display_name) {
        setName(data.display_name);
      }
    }

    loadName();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (!name) return null;

  return (
    <div
      style={{
        fontSize: 14,
        color: "#52525b",
        fontWeight: 600,
        marginTop: 4,
      }}
    >
      Hi, {name} 👋
    </div>
  );
}
