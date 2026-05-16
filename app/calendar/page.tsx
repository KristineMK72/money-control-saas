"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";

type BillRow = { /* your existing BillRow type */ };
type DebtRow = { /* your existing DebtRow type */ };

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

  // Load data (your existing logic)
  useEffect(() => {
    // ... your data loading code ...
  }, [supabase, viewYear, viewMonth]);

  const { calendarItems, weekSummaries, monthSummary } = useMemo(() => {
    // ... your existing logic to build calendarItems and weekSummaries ...

    const summaries = /* your weekSummaries calculation */;

    return {
      calendarItems: /* ... */,
      weekSummaries: summaries.map(w => ({
        ...w,
        incomeNeeded: Math.max(0, w.total), // You can subtract expected income later
      })),
      monthSummary: /* ... */,
    };
  }, [bills, debts, viewYear, viewMonth]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: getMonthName(viewYear, viewMonth),
    totalNeeded: monthSummary.total,
    incomeSoFar: 0,
    incomeGap: monthSummary.total,
    dailyIncomeNeeded: 0,
  });

  return (
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-10`}>
        <header>
          <h1 className="text-5xl font-black text-white tracking-tight">Calendar</h1>
          <p className="mt-2 text-lg text-white/80">Know exactly what’s coming and how much income you need each week.</p>
        </header>

        {/* Ben's Take */}
        <div className="rounded-3xl border border-slate-200 bg-slate-950 p-6 shadow-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        {/* Monthly Overview */}
        <div className="grid gap-4 md:grid-cols-3">
          <SummaryCard label="Total Due This Month" value={money(monthSummary.total)} />
          <SummaryCard label="Bills" value={money(monthSummary.bills)} />
          <SummaryCard label="Debt Minimums" value={money(monthSummary.debts)} />
        </div>

        {/* Weekly Income Targets - The Star Feature */}
        <section>
          <h2 className="mb-6 text-2xl font-black text-white">Weekly Income Targets</h2>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            {weekSummaries.map((week) => {
              const isExpanded = expandedWeeks[week.weekNumber] ?? true;
              const progress = Math.min(Math.round((week.total / 5000) * 100), 100); // example progress

              return (
                <div key={week.weekNumber} className={`${cardClass} overflow-hidden`}>
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-black text-lg">{week.label}</p>
                      <p className="text-sm text-zinc-500">
                        {prettyDate(week.startISO)} — {prettyDate(week.endISO)}
                      </p>
                    </div>
                    <button
                      onClick={() => setExpandedWeeks(p => ({ ...p, [week.weekNumber]: !p[week.weekNumber] }))}
                      className="text-2xl text-zinc-400 hover:text-white"
                    >
                      {isExpanded ? "−" : "+"}
                    </button>
                  </div>

                  <div className="mt-6 text-4xl font-black text-emerald-600">
                    {money(week.incomeNeeded)}
                  </div>
                  <p className="text-sm text-zinc-500">income needed this week</p>

                  {isExpanded && week.items.length > 0 && (
                    <div className="mt-6 space-y-3 border-t border-white/10 pt-4">
                      {week.items.map(item => (
                        <div key={item.id} className="flex justify-between text-sm">
                          <span className="text-zinc-700">{item.name}</span>
                          <span className="font-semibold">{money(item.amount)}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Full Monthly Calendar Grid */}
        <div className={cardClass}>
          {/* Your existing beautiful calendar grid code goes here */}
          {/* ... keep your daysGrid rendering ... */}
        </div>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass}>
      <div className="text-sm font-black uppercase tracking-widest text-zinc-600">{label}</div>
      <div className="mt-3 text-4xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
