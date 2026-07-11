"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  credit_limit: number | null;
  apr: number | null;
};

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function pct(n: number) {
  return `${Number(n || 0).toFixed(0)}%`;
}

const cardClass = "rounded-2xl border border-white/80 bg-white/95 p-6 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl";
const shellClass = "rounded-2xl border border-white/40 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8";

export default function CreditHealthPage() {
  const supabase = createSupabaseBrowserClient();

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [name, setName] = useState("");
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setMessage("Please log in to view your credit health.");
      setLoading(false);
      return;
    }

    const [profileRes, debtsRes] = await Promise.all([
      supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
      supabase.from("debts").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
    ]);

    if (profileRes.data?.display_name) setName(profileRes.data.display_name);
    if (debtsRes.data) setDebts(debtsRes.data as DebtRow[]);

    setLoading(false);
  }

  const creditCards = debts.filter(d => d.kind === "credit");
  const loans = debts.filter(d => d.kind === "loan");

  const totals = useMemo(() => {
    const totalDebt = debts.reduce((sum, d) => sum + Number(d.balance || 0), 0);
    const totalCreditDebt = creditCards.reduce((sum, d) => sum + Number(d.balance || 0), 0);
    const totalCreditLimit = creditCards.reduce((sum, d) => sum + Number(d.credit_limit || 0), 0);
    const utilization = totalCreditLimit > 0 ? (totalCreditDebt / totalCreditLimit) * 100 : 0;
    const totalMinimums = debts.reduce((sum, d) => sum + Number(d.monthly_min_payment || d.min_payment || 0), 0);

    return { totalDebt, totalCreditDebt, totalCreditLimit, utilization, totalMinimums };
  }, [debts]);

  const riskyCards = useMemo(() => {
    return creditCards
      .map(card => ({
        ...card,
        utilization: card.credit_limit ? (Number(card.balance) / Number(card.credit_limit)) * 100 : 0,
      }))
      .sort((a, b) => b.utilization - a.utilization);
  }, [creditCards]);

  // === BEN INSIGHT ===
  const benInsight = BenEngine.getForecastMessage({
    name: name || undefined,
    timeframeLabel: "Credit Health",
    totalNeeded: totals.totalMinimums,
    incomeSoFar: 0,
    incomeGap: totals.totalMinimums,
    dailyIncomeNeeded: 0,
  });

<<<<<<< HEAD
  const maxedCards = useMemo(
    () => riskyCards.filter((c) => c.utilization >= 100),
    [riskyCards]
  );

  const benAdvice = useMemo(() => {
    const items: string[] = [];

    if (totals.utilization >= 75) {
      items.push(
        `${name || "Friend"}, your credit utilization is ${pct(
          totals.utilization
        )}. That is likely putting heavy pressure on your score.`
      );
    } else if (totals.utilization >= 50) {
      items.push(
        `${name || "Friend"}, your utilization is ${pct(
          totals.utilization
        )}. Getting under 30% would be a strong next move.`
      );
    } else if (totals.utilization >= 30) {
      items.push(
        `${name || "Friend"}, your utilization is ${pct(
          totals.utilization
        )}. You are in a watch zone, but not in disaster territory.`
      );
    } else if (creditCards.length > 0) {
      items.push(
        `${name || "Friend"}, your utilization is ${pct(
          totals.utilization
        )}. That is a healthier zone for score pressure.`
      );
    }

    if (maxedCards.length > 0) {
      items.push(
        `${maxedCards.length} card${maxedCards.length === 1 ? " is" : "s are"} maxed or over limit. Those are your highest-priority credit targets.`
      );
    } else if (over80Cards.length > 0) {
      items.push(
        `${over80Cards.length} card${over80Cards.length === 1 ? " is" : "s are"} above 80% utilization. Paying those down first can help the fastest.`
      );
    }

    if (totals.totalMinimums > 0) {
      items.push(
        `Your monthly debt minimums are ${formatUSD(
          totals.totalMinimums
        )}. Protect payment history first, then attack utilization.`
      );
    }

    if (creditCards.length === 0) {
      items.push(
        "No credit-card accounts found yet. Add your cards to unlock utilization coaching."
      );
    }

    return items.slice(0, 4);
  }, [totals, maxedCards, over80Cards, creditCards.length, name]);

  const targetPlan = useMemo(() => {
    return {
      to50: paymentNeededForTarget(
        totals.totalCreditDebt,
        totals.totalCreditLimit,
        50
      ),
      to30: paymentNeededForTarget(
        totals.totalCreditDebt,
        totals.totalCreditLimit,
        30
      ),
      to10: paymentNeededForTarget(
        totals.totalCreditDebt,
        totals.totalCreditLimit,
        10
      ),
    };
  }, [totals]);
    if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950/82 -md px-6 py-10 text-white">
        Loading credit health...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950/82 -md text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Credit Health
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                {name ? `${name}'s Credit Health` : "Credit Health"}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Track utilization, risk cards, score pressure, and the fastest next moves.
              </p>
            </div>
=======
  if (loading) {
    return <div className="p-8 text-center">Loading credit health...</div>;
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-10`}>
        <header>
          <h1 className="text-5xl font-black text-white">Credit Health</h1>
          <p className="mt-2 text-lg font-semibold text-white/90">Understand your score pressure and fastest improvement moves.</p>
        </header>
>>>>>>> ed0e3caecb0f44437c318e467ad26eae9d5ac2c6

        {/* Ben's Insight */}
        <div className="rounded-2xl border border-white/20 bg-slate-950/80 p-6 shadow-xl backdrop-blur-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        {/* Key Stats */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Utilization" value={pct(totals.utilization)} subtext="Lower is better" />
          <StatCard label="Total Debt" value={formatUSD(totals.totalDebt)} />
          <StatCard label="Credit Limit" value={formatUSD(totals.totalCreditLimit)} />
          <StatCard label="Monthly Minimums" value={formatUSD(totals.totalMinimums)} />
        </div>

        {/* Risky Cards */}
        <div className={cardClass}>
          <h2 className="text-2xl font-black mb-4">Highest Risk Cards</h2>
          {riskyCards.length === 0 ? (
            <p>No credit cards found yet.</p>
          ) : (
            riskyCards.map((card) => (
              <div key={card.id} className="mb-6 last:mb-0 border-b pb-6 last:border-0">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="font-semibold text-lg">{card.name}</div>
                    <div className="text-sm text-zinc-600">
                      Balance {formatUSD(card.balance)} - Limit {formatUSD(card.credit_limit || 0)}
                    </div>
                  </div>
                  <div className={`px-4 py-1 rounded-full text-sm font-bold ${card.utilization >= 80 ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>
                    {pct(card.utilization)}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

      </div>
    </main>
  );
}

function StatCard({ label, value, subtext }: { label: string; value: string; subtext?: string }) {
  return (
    <div className={cardClass}>
      <div className="uppercase tracking-widest text-xs font-black text-zinc-600">{label}</div>
      <div className="mt-3 text-4xl font-black text-zinc-950">{value}</div>
      {subtext && <div className="mt-1 text-sm text-zinc-600">{subtext}</div>}
    </div>
  );
}
