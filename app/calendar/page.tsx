"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";

type BillRow = {
  id: string;
  name: string;
  target: number | null;
  monthly_target: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  category?: string | null;
};

type DebtRow = {
  id: string;
  name: string;
  balance: number | null;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const shellClass = "rounded-[2rem] border border-white/20 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-md md:p-8";
const cardClass = "rounded-2xl border border-white/60 bg-white/97 p-6 shadow-2xl backdrop-blur-xl";

export default function CalendarPage() {
  const supabase = createSupabaseBrowserClient();
  const now = new Date();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    loadData();
  }, [viewYear, viewMonth]);

  async function loadData() {
    setLoading(true);
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      setLoading(false);
      return;
    }

    const [billsRes, debtsRes] = await Promise.all([
      supabase.from("bills").select("*").eq("user_id", user.id),
      supabase.from("debts").select("*").eq("user_id", user.id),
    ]);

    setBills(billsRes.data || []);
    setDebts(debtsRes.data || []);
    setLoading(false);
  }

  // Weekly summaries with income needed
  const weekSummaries = useMemo(() => {
    // TODO: Replace with your full logic for building weeks
    // For now using placeholder structure
    return [];
  }, [bills, debts, viewYear, viewMonth]);

  const monthTotal = useMemo(() => {
    return bills.reduce((sum, b) => sum + Number(b.monthly_target || b.target || 0), 0) +
           debts.reduce((sum, d) => sum + Number(d.monthly_min_payment || d.min_payment || 0), 0);
  }, [bills, debts]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: `${new Date(viewYear, viewMonth).toLocaleString('default', { month: 'long', year: 'numeric' })}`,
    totalNeeded: monthTotal,
    incomeSoFar: 0,
    incomeGap: monthTotal,
    dailyIncomeNeeded: Math.ceil(monthTotal / 30),
  });

  if (loading) {
    return <div className="p-8 text-center text-white">Loading calendar...</div>;
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-10`}>
        <header>
          <h1 className="text-5xl font-black text-white tracking-tight">Calendar</h1>
          <p className="mt-2 text-lg text-white/80">See what’s due and how much income you need each week.</p>
        </header>

        {/* Ben Insight */}
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        {/* Monthly Summary */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Total Due This Month" value={money(monthTotal)} />
        </div>

        {/* Weekly Income Targets */}
        <section>
          <h2 className="mb-6 text-2xl font-black text-white">Weekly Income Targets</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {weekSummaries.length > 0 ? (
              weekSummaries.map((week: any) => (
                <div key={week.weekNumber} className={cardClass}>
                  <div className="flex justify-between">
                    <div>
                      <p className="font-black">{week.label}</p>
                      <p className="text-sm text-zinc-500">
                        {week.startISO} — {week.endISO}
                      </p>
                    </div>
                  </div>
                  <div className="mt-6 text-4xl font-black text-emerald-600">
                    {money(week.total)}
                  </div>
                  <p className="text-sm text-zinc-500">needed this week</p>
                </div>
              ))
            ) : (
              <div className={cardClass}>No obligations found for this month yet.</div>
            )}
          </div>
        </section>

        {/* Your original calendar grid can go here */}
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass}>
      <div className="uppercase tracking-widest text-xs font-black text-zinc-600">{label}</div>
      <div className="mt-3 text-4xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
