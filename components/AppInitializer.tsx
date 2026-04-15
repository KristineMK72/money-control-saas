"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMoneyStore } from "@/lib/money/store";

export default function AppInitializer({
  children,
}: {
  children: React.ReactNode;
}) {
  const supabase = createSupabaseBrowserClient();
  const setAll = useMoneyStore((s) => s.setAll);
  const reset = useMoneyStore((s) => s.reset);

  useEffect(() => {
    async function load() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        reset();
        return;
      }

      const [bills, debts, income, spend, payments] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
        supabase.from("income").select("*").eq("user_id", user.id),
        supabase.from("spend_entries").select("*").eq("user_id", user.id),
        supabase.from("payments").select("*").eq("user_id", user.id),
      ]);

      setAll({
        buckets: bills.data ?? [],
        debts: debts.data ?? [],
        income: income.data ?? [],
        spend: spend.data ?? [],
        payments: payments.data ?? [],
      });
    }

    load();
  }, [supabase, setAll, reset]);

  return <>{children}</>;
}
