"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import BenBubble from "@/components/BenBubble";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PatternRow = {
  total_spend: number | string | null;
  spend_count: number | string | null;
  top_spend_category: string | null;
  top_merchant: string | null;
  top_payment_method: string | null;
  total_payments: number | string | null;
  total_income: number | string | null;
  bill_count: number | string | null;
  debt_count: number | string | null;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

function buildAdvice(pathname: string, row: PatternRow) {
  const totalSpend = num(row.total_spend);
  const totalIncome = num(row.total_income);
  const totalPayments = num(row.total_payments);
  const spendCount = num(row.spend_count);
  const billCount = num(row.bill_count);
  const debtCount = num(row.debt_count);

  if (pathname.startsWith("/spend")) {
    if (spendCount === 0) {
      return {
        mood: "thinking",
        text: "Ben says: Add a few spending entries and I shall begin spotting the Treasury leaks.",
      };
    }

    return {
      mood: totalSpend > totalIncome && totalIncome > 0 ? "stern" : "thinking",
      text: `Ben says: Thy top spending pattern appears to be ${
        row.top_spend_category?.replaceAll("_", " ") || "spending"
      }${row.top_merchant ? `, especially around ${row.top_merchant}` : ""}. Watch that habit closely.`,
    };
  }

  if (pathname.startsWith("/income")) {
    return {
      mood: totalIncome > 0 ? "celebratory" : "thinking",
      text:
        totalIncome > 0
          ? `Ben says: The Treasury has recorded ${money(totalIncome)} in income. Now we must give every dollar its orders.`
          : "Ben says: Add income sources and I can help turn effort into a plan.",
    };
  }

  if (pathname.startsWith("/payments")) {
    return {
      mood: totalPayments > 0 ? "celebratory" : "thinking",
      text:
        totalPayments > 0
          ? `Ben says: Thou hast recorded ${money(totalPayments)} in payments. Visible progress is the enemy of despair.`
          : "Ben says: Record payments when they happen. Victories belong in the ledger.",
    };
  }

  if (pathname.startsWith("/bills") || pathname.startsWith("/calendar")) {
    return {
      mood: billCount > 0 ? "mastermind" : "thinking",
      text:
        billCount > 0
          ? `Ben says: I see ${billCount} bills in the colony. Keeping due dates visible prevents ambushes.`
          : "Ben says: Add bills and due dates so the Treasury is not surprised.",
    };
  }

  if (pathname.startsWith("/debt") || pathname.startsWith("/credit")) {
    return {
      mood: debtCount > 0 ? "mastermind" : "thinking",
      text:
        debtCount > 0
          ? `Ben says: I see ${debtCount} debts in the ledger. The next victory comes from choosing the right target.`
          : "Ben says: Add debts and I can help choose between avalanche, snowball, and recovery strategy.",
    };
  }

  if (pathname.startsWith("/forecast")) {
    return {
      mood: totalSpend > totalIncome && totalIncome > 0 ? "stern" : "mastermind",
      text:
        totalSpend > totalIncome && totalIncome > 0
          ? `Ben says: Spending of ${money(totalSpend)} is outrunning income of ${money(totalIncome)}. The forecast deserves attention.`
          : "Ben says: Forecasting turns panic into a plan. Review what is due before the week begins.",
    };
  }

  return {
    mood: totalSpend > totalIncome && totalIncome > 0 ? "stern" : "thinking",
    text:
      totalSpend > totalIncome && totalIncome > 0
        ? `Ben says: The Treasury shows ${money(totalSpend)} spent against ${money(totalIncome)} income. Let us inspect the pattern.`
        : "Ben says: I am watching the ledger for patterns, habits, risks, and victories.",
  };
}

export default function GlobalBenAdvisor() {
  const pathname = usePathname();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [pattern, setPattern] = useState<PatternRow | null>(null);
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    async function loadPattern() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoaded(true);
        return;
      }

      const { data } = await supabase
        .from("ben_user_patterns")
        .select("*")
        .eq("user_id", user.id)
        .maybeSingle();

      setPattern((data || null) as PatternRow | null);
      setLoaded(true);
    }

    void loadPattern();
  }, [pathname, supabase]);

  if (!loaded) return null;

if (!pattern) {
  return (
    <section className="mx-auto mt-4 max-w-6xl px-4">
      <div className="rounded-3xl border border-amber-200 bg-amber-50/95 p-4 shadow-2xl">
        <BenBubble
          message="Ben says: I am gathering ledger evidence. Add income, spending, bills, debts, or payments and I shall become a sharper advisor."
          mood="thinking"
        />
      </div>
    </section>
  );
}

  const advice = buildAdvice(pathname, pattern);

  return (
    <section className="mx-auto mt-4 max-w-6xl px-4">
      <div className="rounded-3xl border border-amber-200 bg-amber-50/95 p-4 shadow-2xl">
        <BenBubble message={advice.text} mood={advice.mood} />
      </div>
    </section>
  );
}
