"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import BenBubble from "@/components/BenBubble";
import BenPersona from "@/components/BenPersona";
import { getForecast } from "@/lib/ben/forecast";

type ForecastResult = {
  ben: { text: string; mood: string };
  projectedOnTrack: boolean;
  incomeGap: number;
  dailyIncomeNeeded: number;
};

type Bill = {
  id: string;
  user_id: string;
  amount: number | null;
  target: number | null;
  monthly_target: number | null;
  min_payment: number | null;
};

type Debt = {
  id: string;
  user_id: string;
  min_payment: number | null;
};

type IncomeEntry = {
  id: string;
  user_id: string;
  amount: number;
  date_iso: string | null;
  received_on: string | null;
  created_at: string;
};

function getMonthlyBillAmount(bill: Bill) {
  if (bill.target && bill.target > 0) return bill.target;
  if (bill.monthly_target && bill.monthly_target > 0) return bill.monthly_target;
  if (bill.min_payment && bill.min_payment > 0) return bill.min_payment;
  if (bill.amount && bill.amount > 0) return bill.amount;
  return 0;
}

function isSameMonth(d: Date, ref: Date) {
  return d.getFullYear() === ref.getFullYear() && d.getMonth() === ref.getMonth();
}

export default function ForecastPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [incomeSoFar, setIncomeSoFar] = useState(0);
  const [forecast, setForecast] = useState<ForecastResult | null>(null);
  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">(
    "month"
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setLoading(false);
        return;
      }

      const userId = session.user.id;
      const today = new Date();

      // Bills
      const { data: bills } = await supabase
        .from("bills")
        .select("amount,target,monthly_target,min_payment,user_id")
        .eq("user_id", userId);

      const billsSafe = (bills || []) as Bill[];
      const billsTotal = billsSafe.reduce(
        (sum, b) => sum + getMonthlyBillAmount(b),
        0
      );

      // Debts
      const { data: debts } = await supabase
        .from("debts")
        .select("min_payment,user_id")
        .eq("user_id", userId);

      const debtsSafe = (debts || []) as Debt[];
      const debtMinTotal = debtsSafe.reduce(
        (sum, d) => sum + (d.min_payment || 0),
        0
      );

      const totalObligations = billsTotal + debtMinTotal;
      setTotalNeeded(totalObligations);

      // Income (this month so far)
      const { data: income } = await supabase
        .from("income_entries")
        .select("amount,date_iso,received_on,created_at,user_id")
        .eq("user_id", userId);

      const incomeSafe = (income || []) as IncomeEntry[];
      const incomeTotal = incomeSafe.reduce((sum, i) => {
        const date =
          (i.date_iso && new Date(i.date_iso)) ||
          (i.received_on && new Date(i.received_on)) ||
          new Date(i.created_at);

        if (!isNaN(date.getTime()) && isSameMonth(date, today)) {
          return sum + (i.amount || 0);
        }
        return sum;
      }, 0);

      setIncomeSoFar(incomeTotal);

      // Forecast math
      const daysElapsed = today.getDate();
      const daysTotal = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();

      const result = getForecast({
        name: null,
        timeframeLabel:
          timeframe === "day"
            ? "Daily Forecast"
            : timeframe === "week"
            ? "Weekly Forecast"
            : timeframe === "year"
            ? "Year Forecast"
            : "Forecast",
        totalNeeded: totalObligations,
        incomeSoFar: incomeTotal,
        daysElapsed,
        daysTotal,
      }) as ForecastResult;

      setForecast(result);
      setLoading(false);
    }

    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [timeframe]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <BenBubble text="Crunching the numbers…" mood="witty" />
          <p className="text-zinc-500 mt-4 text-sm">Loading your forecast…</p>
        </div>
      </main>
    );
  }

  if (!forecast) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
        <div className="mx-auto w-full max-w-5xl">
          <BenBubble
            text="I couldn’t gather enough data to forecast your month."
            mood="stern"
          />
        </div>
      </main>
    );
  }

  const healthScore = (() => {
    let score = 100;

    if (!forecast.projectedOnTrack) score -= 25;
    if (forecast.incomeGap > 0) score -= Math.min(25, forecast.incomeGap / 10);
    if (forecast.dailyIncomeNeeded > 50) score -= 20;

    return Math.max(0, Math.round(score));
  })();

  const chartLabel =
    timeframe === "day"
      ? "Next 7 days cash trajectory"
      : timeframe === "week"
      ? "Next 12 weeks cash trajectory"
      : timeframe === "year"
      ? "12‑month cash trajectory"
      : "30‑day cash trajectory";

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-10 pb-24">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
            <p className="text-xs text-zinc-400">
              Ben’s projection of your cashflow and obligations for the rest of
              the month.
            </p>
          </div>

          <div className="flex items-center gap-2 text-[11px]">
            <button
              onClick={() => setTimeframe("day")}
              className={`rounded-full px-3 py-1 border ${
                timeframe === "day"
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              Day
            </button>
            <button
              onClick={() => setTimeframe("week")}
              className={`rounded-full px-3 py-1 border ${
                timeframe === "week"
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              Week
            </button>
            <button
              onClick={() => setTimeframe("month")}
              className={`rounded-full px-3 py-1 border ${
                timeframe === "month"
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              Month
            </button>
            <button
              onClick={() => setTimeframe("year")}
              className={`rounded-full px-3 py-1 border ${
                timeframe === "year"
                  ? "border-emerald-400 bg-emerald-400/10 text-emerald-300"
                  : "border-zinc-700 bg-zinc-900 text-zinc-400"
              }`}
            >
              Year
            </button>
          </div>
        </header>

        {/* Ben Narration */}
        <BenBubble text={forecast.ben.text} mood={forecast.ben.mood} />

        {/* Chart */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <div className="text-xs font-semibold text-zinc-400">
            {chartLabel}
          </div>
          <div className="h-48 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
            Chart coming soon — this is where we’ll plot your projected balance
            over time for the selected timeframe.
          </div>
        </section>

        {/* Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <p className="text-xs text-zinc-400">Total Obligations (Bills + Min)</p>
            <p className="text-2xl font-semibold text-white">
              ${totalNeeded.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <p className="text-xs text-zinc-400">Income So Far (This Month)</p>
            <p className="text-2xl font-semibold text-white">
              ${incomeSoFar.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <p className="text-xs text-zinc-400">Status</p>
            <p
              className={`text-2xl font-semibold ${
                forecast.projectedOnTrack ? "text-emerald-400" : "text-orange-400"
              }`}
            >
              {forecast.projectedOnTrack ? "On Track" : "Behind"}
            </p>
          </div>
        </section>

        {/* Month Health Score */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-2">
          <p className="text-xs text-zinc-400">Month Health Score</p>
          <p className="text-4xl font-bold text-white">{healthScore}</p>
          <p className="text-xs text-zinc-500">
            A quick read on how manageable this month looks based on your
            obligations and income pace.
          </p>
        </section>

        {/* Ben Alerts */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <p className="text-xs font-semibold text-zinc-400">Ben’s Alerts</p>
          <ul className="space-y-2 text-sm text-zinc-300">
            {forecast.incomeGap > 0 && (
              <li>• You’re short ${forecast.incomeGap.toFixed(2)} this month.</li>
            )}
            {forecast.dailyIncomeNeeded > 50 && (
              <li>
                • Daily needed income is unusually high — consider smoothing
                expenses or pulling income forward.
              </li>
            )}
            {forecast.projectedOnTrack && (
              <li>• You’re pacing well — keep your current rhythm.</li>
            )}
            <li>• Ben is monitoring bill clusters and cash dips.</li>
          </ul>
        </section>

        {/* Scenario Testing */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-xs font-semibold text-zinc-400">Scenario Testing</p>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500">
              Coming soon
            </span>
          </div>
          <p className="text-xs text-zinc-500">
            Ask Ben things like “What if I pay $200 extra on my card?” or “Can I
            afford a $150 subscription?” and see the impact instantly. We’ll wire
            this into the same forecast engine you’re seeing above.
          </p>
        </section>

        {/* Ben Persona */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <BenPersona />
        </section>
      </div>
    </main>
  );
}
