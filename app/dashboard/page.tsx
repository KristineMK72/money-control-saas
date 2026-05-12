"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import BenBubble from "@/components/BenBubble";

type SpendRow = {
  id: string;
  amount: number | string | null;
  category: string | null;
};

type BenMasterAny = Record<string, any>;

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [master, setMaster] = useState<BenMasterAny | null>(null);
  const [loading, setLoading] = useState(true);
  const [debugError, setDebugError] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setDebugError("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setDebugError(`Session error: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      const user = session?.user;

      if (!user) {
        setDebugError("No client session found. Try logging in again.");
        setLoading(false);
        return;
      }

      const uid = user.id;

      const [spendRes, masterRes] = await Promise.all([
        supabase
          .from("spend_entries")
          .select("id, amount, category")
          .eq("user_id", uid),

        supabase
          .from("ben_master")
          .select("*")
          .eq("user_id", uid)
          .maybeSingle(),
      ]);

      if (spendRes.error) {
        console.error("Dashboard spend error:", spendRes.error);
      }

      if (masterRes.error) {
        console.error("Dashboard ben_master error:", masterRes.error);
      }

      console.log("Dashboard user id:", uid);
      console.log("Dashboard spend:", spendRes);
      console.log("Dashboard ben_master:", masterRes);

      setSpend((spendRes.data || []) as SpendRow[]);
      setMaster((masterRes.data || null) as BenMasterAny | null);

      const messages = [
        spendRes.error ? `Spend error: ${spendRes.error.message}` : "",
        masterRes.error ? `Ben master error: ${masterRes.error.message}` : "",
        !masterRes.data ? "No ben_master row returned." : "",
      ].filter(Boolean);

      setDebugError(messages.join(" "));
      setLoading(false);
    }

    void load();
  }, [supabase]);

  const totalIncome = num(master?.total_income ?? master?.income);
  const totalSpend = num(master?.total_spend ?? master?.spend);
  const totalDebtBalance = num(
    master?.total_debt_balance ?? master?.total_debt
  );
  const net = num(master?.net ?? master?.leftover);
  const totalDebtMinimums = num(
    master?.total_debt_minimums ?? master?.monthly_minimums
  );

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};

    for (const s of spend) {
      const cat = s.category || "misc";
      map[cat] = (map[cat] || 0) + num(s.amount);
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
        <div className="mx-auto max-w-6xl rounded-xl border border-zinc-200 bg-white/90 p-6">
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-zinc-950">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">
            Live money snapshot from Supabase. Ben is watching the totals, not
            judging. Mostly.
          </p>

          <div className="mt-4">
            <BenBubble message={ben.text} mood={ben.mood} />
          </div>

          {debugError && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              {debugError}
            </div>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Income" value={totalIncome} />
          <Card label="Spend" value={totalSpend} />
          <Card label="Debt" value={totalDebtBalance} />
          <Card label="Net" value={net} />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Top spending category"
            value={topCategory}
            text="The largest category from your tracked spend entries."
          />

          <InfoCard
            title="Debt minimums"
            value={formatUSD(totalDebtMinimums)}
            text="Monthly debt minimums from your debt records."
          />

          <InfoCard
            title="Income gap"
            value={formatUSD(incomeGap)}
            text="How much more income is needed to cover spend plus debt minimums."
          />
        </section>

        <section className="mt-8 rounded-xl border border-zinc-200 bg-white/90 p-6 text-sm text-zinc-600 backdrop-blur space-y-1">
          <div>Spend lines loaded: {spend.length}</div>
          <div>Obligations: {formatUSD(totalObligations)}</div>
          <div>Ben master row: {master ? "loaded" : "missing"}</div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-4 backdrop-blur">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-black text-zinc-950">
        {formatUSD(value)}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  value,
  text,
}: {
  title: string;
  value: string;
  text: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white/90 p-6 backdrop-blur">
      <h2 className="font-bold text-zinc-900">{title}</h2>
      <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
      <p className="mt-2 text-sm text-zinc-600">{text}</p>
    </div>
  );
}
