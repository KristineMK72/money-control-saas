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

type BenMasterRow = {
  user_id: string;
  date: string;
  income?: number | string | null;
  spend?: number | string | null;
  bills?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  pressure_pct?: number | string | null;
  total_debt?: number | string | null;
  monthly_minimums?: number | string | null;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  total_debt_balance?: number | string | null;
  total_debt_minimums?: number | string | null;
  net?: number | string | null;
};

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatUSD(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const panelClass =
  "rounded-xl border border-white/40 bg-white/88 shadow-xl";

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [master, setMaster] = useState<BenMasterRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [notice, setNotice] = useState("");

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setNotice("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setNotice(`Session error: ${sessionError.message}`);
        setLoading(false);
        return;
      }

      const user = session?.user;

      if (!user) {
        setNotice("No client session found. Log in again if the numbers do not load.");
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
        console.error("Dashboard spend_entries error:", spendRes.error);
      }

      if (masterRes.error) {
        console.error("Dashboard ben_master error:", masterRes.error);
      }

      setSpend((spendRes.data || []) as SpendRow[]);
      setMaster((masterRes.data || null) as BenMasterRow | null);

      const messages = [
        spendRes.error ? `Spend error: ${spendRes.error.message}` : "",
        masterRes.error ? `Ben master error: ${masterRes.error.message}` : "",
        !masterRes.data ? "No ben_master row returned for this user." : "",
      ].filter(Boolean);

      setNotice(messages.join(" "));
      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  const totalIncome = num(master?.total_income ?? master?.income);
  const totalSpend = num(master?.total_spend ?? master?.spend);
  const totalDebtBalance = num(master?.total_debt_balance ?? master?.total_debt);
  const totalDebtMinimums = num(
    master?.total_debt_minimums ?? master?.monthly_minimums
  );
  const net = num(master?.net ?? master?.leftover);
  const bills = num(master?.bills);
  const payments = num(master?.payments);
  const pressurePct = num(master?.pressure_pct);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};

    for (const row of spend) {
      const category = row.category || "misc";
      totals[category] = (totals[category] || 0) + num(row.amount);
    }

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [spend]);

  const topCategoryName = topCategory?.[0] || "—";
  const topCategoryAmount = topCategory?.[1] || 0;

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
        <div className={`${panelClass} mx-auto max-w-6xl p-6`}>
          Loading dashboard...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-6">
      <div className="mx-auto max-w-6xl">
        <header className="mb-6 rounded-2xl border border-white/40 bg-white/88 p-6 shadow-xl">
          <h1 className="text-3xl font-black text-zinc-950">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-700">
            Your live AskBen money snapshot from Supabase.
          </p>

          <div className="mt-4">
            <BenBubble message={ben.text} mood={ben.mood} />
          </div>

          {notice && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              {notice}
            </div>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-4">
          <Card label="Income" value={formatUSD(totalIncome)} />
          <Card label="Spend" value={formatUSD(totalSpend)} />
          <Card label="Debt" value={formatUSD(totalDebtBalance)} />
          <Card label="Net" value={formatUSD(net)} />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Bills"
            value={formatUSD(bills)}
            text="Monthly bills from the Ben master summary."
          />

          <InfoCard
            title="Debt minimums"
            value={formatUSD(totalDebtMinimums)}
            text="Monthly minimum payments from your debt records."
          />

          <InfoCard
            title="Payments"
            value={formatUSD(payments)}
            text="Payments tracked this month."
          />
        </section>

        <section className="mt-8 grid gap-4 md:grid-cols-3">
          <InfoCard
            title="Top spending category"
            value={topCategoryName}
            text={
              topCategory
                ? `${formatUSD(topCategoryAmount)} tracked in this category.`
                : "No spend categories loaded yet."
            }
          />

          <InfoCard
            title="Income gap"
            value={formatUSD(incomeGap)}
            text="How much more income is needed to cover spend plus debt minimums."
          />

          <InfoCard
            title="Pressure"
            value={pressurePct ? `${pressurePct.toFixed(1)}%` : "—"}
            text="Debt minimum pressure compared with current month income."
          />
        </section>

        <section className={`${panelClass} mt-8 p-6 text-sm text-zinc-700 space-y-1`}>
          <div>Spend lines loaded: {spend.length}</div>
          <div>Ben master row: {master ? "loaded" : "missing"}</div>
          <div>Obligations: {formatUSD(totalObligations)}</div>
        </section>
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: string }) {
  return (
    <div className={`${panelClass} p-4`}>
      <div className="text-sm text-zinc-600">{label}</div>
      <div className="text-2xl font-black text-zinc-950">{value}</div>
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
    <div className={`${panelClass} p-6`}>
      <h2 className="font-bold text-zinc-900">{title}</h2>
      <p className="mt-2 text-2xl font-black text-zinc-950">{value}</p>
      <p className="mt-2 text-sm text-zinc-700">{text}</p>
    </div>
  );
}
