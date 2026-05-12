"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import BenBubble from "@/components/BenBubble";
import type { BenMasterRow } from "@/lib/ben/viewTypes";

type SpendRow = {
  id: string;
  amount: number;
  category: string | null;
};

function formatUSD(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [master, setMaster] = useState<BenMasterRow | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user) {
        setLoading(false);
        return;
      }

      const uid = sessionData.session.user.id;

      const [spendRes, masterRes] = await Promise.all([
        supabase.from("spend_entries").select("id, amount, category").eq("user_id", uid),
        supabase.from("ben_master").select("*").eq("user_id", uid).maybeSingle(),
      ]);

      setSpend((spendRes.data || []) as SpendRow[]);
      setMaster((masterRes.data as BenMasterRow) || null);

      setLoading(false);
    }

    void load();
  }, [supabase]);

  const totalIncome = Number(master?.total_income ?? 0);
  const totalSpend = Number(master?.total_spend ?? 0);
  const totalDebtBalance = Number(master?.total_debt_balance ?? 0);
  const net = Number(master?.net ?? 0);
  const totalDebtMinimums = Number(master?.total_debt_minimums ?? 0);

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};

    for (const s of spend) {
      const cat = s.category || "misc";
      map[cat] = (map[cat] || 0) + Number(s.amount || 0);
    }

    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [spend]);

  const totalObligations = totalSpend + totalDebtMinimums;
  const incomeGap = Math.max(0, totalObligations - totalIncome);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Dashboard",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: 0,
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className="text-sm text-zinc-600">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-zinc-950">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Income, spend, debt, and net are loaded from your live Supabase totals
            (same numbers as the Ben “master” summary in the database). Category
            insight still comes from your spend lines.
          </p>

          <div className="mt-4">
            <BenBubble message={ben.text} mood={ben.mood} />
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Card label="Income" value={totalIncome} />
          <Card label="Spend" value={totalSpend} />
          <Card label="Debt" value={totalDebtBalance} />
          <Card label="Net" value={net} />
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white/90 p-6 backdrop-blur">
          <h2 className="font-bold text-zinc-900">Top spending category</h2>
          <p className="mt-2 text-2xl font-black text-zinc-950">{topCategory}</p>
          <p className="mt-2 text-sm text-zinc-600">
            This is where the largest share of your tracked spending is going
            right now.
          </p>
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white/90 p-6 text-sm text-zinc-600 backdrop-blur space-y-1">
          <div>Spend lines: {spend.length}</div>
          <div>Debt minimums (monthly): {formatUSD(totalDebtMinimums)}</div>
          <div>Obligations (spend + minimums): {formatUSD(totalObligations)}</div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 backdrop-blur">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-black text-zinc-950">{formatUSD(value)}</div>
    </div>
  );
}
