"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hydrateStore } from "@/lib/money/hydrateStore";

export default function AppInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const [billsRes, debtsRes, incomeRes, spendRes, paymentsRes] =
        await Promise.all([
          supabase.from("bills").select("*").eq("user_id", user.id),
          supabase.from("debts").select("*").eq("user_id", user.id),
          supabase.from("income").select("*").eq("user_id", user.id),
          supabase.from("spend_entries").select("*").eq("user_id", user.id),
          supabase.from("payments").select("*").eq("user_id", user.id),
        ]);

      const store = hydrateStore({
        buckets: billsRes.data ?? [],
        debts: debtsRes.data ?? [],
        income: incomeRes.data ?? [],
        spend: spendRes.data ?? [],
        payments: paymentsRes.data ?? [],
      });

      // optional debug
      console.log("Hydrated store:", store);
    }

    load();
  }, [supabase]);

  return <>{children}</>;
}
