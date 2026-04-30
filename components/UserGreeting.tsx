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

      // Try by id first (matches dashboard schema)
      let profile: any = null;
      const byId = await supabase
        .from("profiles")
        .select("display_name,first_name,name,full_name")
        .eq("id", user.id)
        .maybeSingle();

      if (byId.data) {
        profile = byId.data;
      } else {
        // Fallback: try by user_id
        const byUserId = await supabase
          .from("profiles")
          .select("display_name,first_name,name,full_name")
          .eq("user_id", user.id)
          .maybeSingle();
        profile = byUserId.data;
      }

      const resolved =
        profile?.display_name ||
        profile?.first_name ||
        profile?.name ||
        profile?.full_name ||
        (user.email ? user.email.split("@")[0] : "");

      if (mounted && resolved) {
        // Capitalize first letter for email-handle fallback
        const pretty =
          resolved.charAt(0).toUpperCase() + resolved.slice(1);
        setName(pretty);
      }
    }

    loadName();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  if (!name) return null;

  return (
    <div className="text-sm font-semibold text-zinc-600">
      Hi, {name} 👋
    </div>
  );
}
