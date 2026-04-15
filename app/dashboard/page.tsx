"use client";

import { useEffect } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { useMoneyStore } from "@/lib/money/store";

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const {
    spend,
    income,
    debts,
    buckets,
    payments,
    setAll,
  } = useMoneyStore();

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

      setAll({
        buckets: billsRes.data ?? [],
        debts: debtsRes.data ?? [],
        income: incomeRes.data ?? [],
        spend: spendRes.data ?? [],
        payments: paymentsRes.data ?? [],
      });
    }

    load();
  }, [supabase, setAll]);

  // -------------------------
  // DERIVED METRICS
  // -------------------------

  const totalSpend = spend.reduce(
    (sum, s: any) => sum + Number(s.amount || 0),
    0
  );

  const totalIncome = income.reduce(
    (sum: number, i: any) => sum + Number(i.amount || 0),
    0
  );

  const totalDebt = debts.reduce(
    (sum: number, d: any) => sum + Number(d.amount || 0),
    0
  );

  const net = totalIncome - totalSpend - totalDebt;

  const categoryTotals: Record<string, number> = {};

  for (const s of spend) {
    const cat = s.category || "misc";
    categoryTotals[cat] = (categoryTotals[cat] || 0) + Number(s.amount || 0);
  }

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "—";

  // -------------------------
  // UI
  // -------------------------

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Your financial snapshot powered by AskBen.
        </p>

        {/* SUMMARY CARDS */}
        <div className="mt-8 grid gap-4 md:grid-cols-4">
          <Card label="Income" value={totalIncome} />
          <Card label="Spend" value={totalSpend} />
          <Card label="Debt" value={totalDebt} />
          <Card label="Net" value={net} highlight />
        </div>

        {/* INSIGHTS */}
        <div className="mt-10 grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-bold">Top Spending Category</h2>
            <p className="mt-3 text-2xl font-black">{topCategory}</p>
          </div>

          <div className="rounded-2xl border bg-white p-6">
            <h2 className="font-bold">Accounts Overview</h2>

            <div className="mt-3 space-y-2 text-sm text-zinc-600">
              <div>Buckets: {buckets.length}</div>
              <div>Income sources: {income.length}</div>
              <div>Debts: {debts.length}</div>
              <div>Payments: {payments.length}</div>
            </div>
          </div>
        </div>

        {/* SPEND BREAKDOWN */}
        <div className="mt-10 rounded-2xl border bg-white p-6">
          <h2 className="font-bold">Spend Breakdown</h2>

          <div className="mt-4 grid gap-2">
            {Object.entries(categoryTotals).length === 0 ? (
              <p className="text-sm text-zinc-500">No spending yet.</p>
            ) : (
              Object.entries(categoryTotals).map(([cat, val]) => (
                <div
                  key={cat}
                  className="flex items-center justify-between rounded-lg bg-zinc-50 px-4 py-2"
                >
                  <span className="text-sm font-medium">{cat}</span>
                  <span className="text-sm font-semibold">
                    ${Number(val).toFixed(2)}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

// -------------------------
// SMALL UI COMPONENT
// -------------------------
function Card({
  label,
  value,
  highlight,
}: {
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={`rounded-2xl border bg-white p-5 ${
        highlight ? "border-black" : "border-zinc-200"
      }`}
    >
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-2xl font-black">
        ${Number(value).toFixed(2)}
      </div>
    </div>
  );
}
