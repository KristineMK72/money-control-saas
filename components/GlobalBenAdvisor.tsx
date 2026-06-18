"use client";

import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BenMood = "encouraging" | "stern" | "urgent" | "witty" | "celebratory";

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

type Advice = {
  mood: BenMood;
  text: string;
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

function cleanLabel(value: string | null) {
  return value ? value.replaceAll("_", " ") : "spending";
}

function moodImage(mood: BenMood) {
  if (mood === "stern" || mood === "urgent") return "/ben-facepalm.png";
  if (mood === "celebratory") return "/ben-winning.png";
  if (mood === "witty") return "/ben-mastermind.png";
  return "/ben-thinking.png";
}

function buildAdvice(pathname: string, row: PatternRow): Advice {
  const totalSpend = num(row.total_spend);
  const totalIncome = num(row.total_income);
  const totalPayments = num(row.total_payments);
  const spendCount = num(row.spend_count);
  const billCount = num(row.bill_count);
  const debtCount = num(row.debt_count);

  if (pathname.startsWith("/spend")) {
    if (spendCount === 0) {
      return {
        mood: "encouraging",
        text: "Add a few spending entries and I shall begin spotting the Treasury leaks.",
      };
    }

    return {
      mood: totalSpend > totalIncome && totalIncome > 0 ? "stern" : "encouraging",
      text: `Thy top spending pattern appears to be ${cleanLabel(
        row.top_spend_category
      )}${row.top_merchant ? `, especially around ${row.top_merchant}` : ""}. Watch that habit closely.`,
    };
  }

  if (pathname.startsWith("/income")) {
    return {
      mood: totalIncome > 0 ? "celebratory" : "encouraging",
      text:
        totalIncome > 0
          ? `The Treasury has recorded ${money(totalIncome)} in income. Now we must give every dollar its orders.`
          : "Add income sources and I can help turn effort into a plan.",
    };
  }

  if (pathname.startsWith("/payments")) {
    return {
      mood: totalPayments > 0 ? "celebratory" : "encouraging",
      text:
        totalPayments > 0
          ? `Thou hast recorded ${money(totalPayments)} in payments. Visible progress is the enemy of despair.`
          : "Record payments when they happen. Victories belong in the ledger.",
    };
  }

  if (pathname.startsWith("/bills") || pathname.startsWith("/calendar")) {
    return {
      mood: billCount > 0 ? "witty" : "encouraging",
      text:
        billCount > 0
          ? `I see ${billCount} bills in the colony. Keeping due dates visible prevents ambushes.`
          : "Add bills and due dates so the Treasury is not surprised.",
    };
  }

  if (pathname.startsWith("/debt") || pathname.startsWith("/credit")) {
    return {
      mood: debtCount > 0 ? "witty" : "encouraging",
      text:
        debtCount > 0
          ? `I see ${debtCount} debts in the ledger. The next victory comes from choosing the right target.`
          : "Add debts and I can help choose between avalanche, snowball, and recovery strategy.",
    };
  }

  if (pathname.startsWith("/forecast")) {
    return {
      mood: totalSpend > totalIncome && totalIncome > 0 ? "stern" : "witty",
      text:
        totalSpend > totalIncome && totalIncome > 0
          ? `Spending of ${money(totalSpend)} is outrunning income of ${money(totalIncome)}. The forecast deserves attention.`
          : "Forecasting turns panic into a plan. Review what is due before the week begins.",
    };
  }

  return {
    mood: totalSpend > totalIncome && totalIncome > 0 ? "stern" : "encouraging",
    text:
      totalSpend > totalIncome && totalIncome > 0
        ? `The Treasury shows ${money(totalSpend)} spent against ${money(totalIncome)} income. Let us inspect the pattern.`
        : "I am watching the ledger for patterns, habits, risks, and victories.",
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

  const advice: Advice = pattern
    ? buildAdvice(pathname, pattern)
    : {
        mood: "encouraging",
        text: "I am gathering ledger evidence. Add income, spending, bills, debts, or payments and I shall become a sharper advisor.",
      };

  return (
    <section className="mx-auto mt-4 max-w-6xl px-4">
      <div className="rounded-[2rem] border border-amber-300 bg-amber-50/95 p-5 shadow-2xl backdrop-blur-xl">
        <div className="flex items-start gap-4">
          <img
            src={moodImage(advice.mood)}
            alt="Ben advisor"
            className="h-16 w-16 shrink-0 rounded-2xl border border-amber-200 bg-white object-contain p-1 shadow-md"
          />

          <div>
            <p className="text-xs font-black uppercase tracking-[0.22em] text-amber-800">
              Ben&apos;s Almanack
            </p>

            <p className="mt-2 text-lg font-black leading-8 text-zinc-950">
              Ben says: {advice.text}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}
