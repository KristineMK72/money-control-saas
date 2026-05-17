"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";

type BillRow = {
  id: string;
  name: string;
  target?: number | null;
  monthly_target?: number | null;
  due_date?: string | null;
  category?: string | null;
};

type DebtRow = {
  id: string;
  name: string;
  balance?: number | null;
  min_payment?: number | null;
  monthly_min_payment?: number | null;
  due_date?: string | null;
  category?: string | null;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const shellClass = "rounded-[2rem] border border-white/20 bg-slate-950/75 p-6 shadow-2xl backdrop-blur-md md:p-8";
const cardClass = "rounded-2xl border border-white/60 bg-white/97 p-6 shadow-2xl backdrop-blur-xl cursor-pointer transition hover:bg-white";

export default function CrisisPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    loadCrisisData();
  }, []);

  async function loadCrisisData() {
    setLoading(true);
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      setMessage("Please log in to access Crisis Mode.");
      setLoading(false);
      return;
    }

    const [billsRes, debtsRes, incomeRes] = await Promise.all([
      supabase.from("bills").select("*").eq("user_id", session.user.id),
      supabase.from("debts").select("*").eq("user_id", session.user.id),
      supabase.from("income_entries").select("*").eq("user_id", session.user.id),
    ]);

    setBills(billsRes.data || []);
    setDebts(debtsRes.data || []);
    setIncomeEntries(incomeRes.data || []);
    setLoading(false);
  }

  const rankedItems = useMemo(() => {
    const items = [
      ...bills.map(b => ({
        id: `bill-${b.id}`,
        name: b.name,
        amount: Number(b.monthly_target || b.target || 0),
        dueDate: b.due_date,
        category: b.category || "bill",
        source: "bill" as const,
      })),
      ...debts.map(d => ({
        id: `debt-${d.id}`,
        name: d.name,
        amount: Number(d.monthly_min_payment || d.min_payment || d.balance || 0),
        dueDate: d.due_date,
        category: "debt",
        source: "debt" as const,
      })),
    ];
    return items.sort((a, b) => b.amount - a.amount);
  }, [bills, debts]);

  const top3 = rankedItems.slice(0, 3);
  const criticalNext7Total = rankedItems.reduce((sum, item) => sum + item.amount, 0);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Crisis Mode",
    totalNeeded: criticalNext7Total,
    incomeSoFar: incomeEntries.reduce((sum, i) => sum + Number(i.amount || 0), 0),
    incomeGap: criticalNext7Total,
    dailyIncomeNeeded: Math.ceil(criticalNext7Total / 7),
  });

  if (loading) {
    return <div className="p-8 text-center">Loading crisis triage...</div>;
  }

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-10`}>
        <header>
          <h1 className="text-5xl font-black text-white">Crisis Mode</h1>
          <p className="mt-2 text-lg text-white/80">72-hour triage — Focus on what matters most right now.</p>
        </header>

        {/* Ben’s Guidance */}
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        {/* Key Stats */}
        <div className="grid gap-4 md:grid-cols-3">
          <StatCard label="Critical Next 7 Days" value={money(criticalNext7Total)} />
          <StatCard label="Top Priority Items" value={top3.length.toString()} />
          <StatCard label="Total Obligations" value={money(rankedItems.reduce((sum, i) => sum + i.amount, 0))} />
        </div>

        {/* Top 3 Actions - Click to Expand */}
        <div className={cardClass}>
          <h2 className="text-2xl font-black mb-6">Top 3 Actions Right Now</h2>
          <div className="space-y-4">
            {top3.length > 0 ? (
              top3.map((item, i) => (
                <div
                  key={item.id}
                  onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                  className="rounded-2xl border border-white/40 bg-white/80 p-5 cursor-pointer hover:bg-white transition"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-emerald-600">#{i + 1}</div>
                    <div className="flex-1">
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-zinc-600">Tap for details</div>
                    </div>
                    <div className="text-right font-black text-xl">{money(item.amount)}</div>
                  </div>

                  {expandedId === item.id && (
                    <div className="mt-4 pt-4 border-t border-white/30 text-sm text-zinc-700">
                      Due: {item.dueDate || "No date"} • Type: {item.category}
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-zinc-600">No priority items found yet. Add some bills or debts.</p>
            )}
          </div>
        </div>

        {/* Full Ranked List */}
        <div className={cardClass}>
          <h2 className="text-2xl font-black mb-6">Everything Ranked by Urgency</h2>
          <div className="space-y-3">
            {rankedItems.map((item, i) => (
              <div
                key={item.id}
                onClick={() => setExpandedId(expandedId === item.id ? null : item.id)}
                className="flex items-center justify-between rounded-2xl border border-white/40 bg-white/80 p-5 cursor-pointer hover:bg-white transition"
              >
                <div className="flex items-center gap-4">
                  <span className="font-mono text-sm text-zinc-500">#{i + 1}</span>
                  <div>
                    <div className="font-semibold">{item.name}</div>
                    <div className="text-xs text-zinc-500">{item.category}</div>
                  </div>
                </div>
                <div className="text-right font-black text-xl">{money(item.amount)}</div>
              </div>
            ))}
          </div>
        </div>
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
