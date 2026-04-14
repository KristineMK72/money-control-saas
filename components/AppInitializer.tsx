"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { hydrateMoneyStore } from "@/lib/money/hydrateStore";

export default function AppInitializer({ children }: { children: React.ReactNode }) {
  const supabase = createSupabaseBrowserClient();

  useEffect(() => {
    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const [bills, debts, income, spend, payments] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
        supabase.from("income").select("*").eq("user_id", user.id),
        supabase.from("spend").select("*").eq("user_id", user.id),
        supabase.from("payments").select("*").eq("user_id", user.id),
      ]);

      hydrateMoneyStore({
        buckets: bills.data,
        debts: debts.data,
        income: income.data,
        spend: spend.data,
        payments: payments.data,
      });
    }

    load();
  }, []);

  return <>{children}</>;
}
