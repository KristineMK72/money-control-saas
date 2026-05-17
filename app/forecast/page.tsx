"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { getForecast } from "@/lib/ben/forecast";
import type { BenMasterRow } from "@/lib/ben/viewTypes";

type BenMasterAny = BenMasterRow & Record<string, unknown>;

const cardClass =
  "rounded-2xl border border-white/80 bg-white/95 p-5 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl";

const darkCardClass =
  "rounded-2xl border border-white/20 bg-zinc-950/80 p-5 text-white shadow-2xl shadow-zinc-950/20 backdrop-blur-xl";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function ForecastPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ReturnType<typeof getForecast> | null>(
    null
  );
  const [message, setMessage] = useState("");

  const [breakdown, setBreakdown] = useState({
    income: 0,
    bills: 0,
    debtMinimums: 0,
    historicalSpend: 0,
    monthlyNeed: 0,
    weeklyNeed: 0,
    dailyNeed: 0,
    remainingNeed: 0,
    daysTotal: 0,
    daysElapsed: 0,
    daysLeft: 0,
  });

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setMessage(sessionError.message);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setMessage("Please log in to view your forecast.");
        setLoading(false);
        return;
      }

      const currentMonth = new Date().toISOString().slice(0, 7) + "-01";

    const { data: master, error } = await supabase
      .from("ben_master_monthly")
      .select("*")
      .eq("user_id", session.user.id)
      .eq("month", currentMonth)
      .maybeSingle();

      if (error) {
        setMessage(error.message);
        setForecast(null);
        setLoading(false);
        return;
      }

      const m = master as BenMasterAny | null;

      const incomeSoFar = num(m?.total_income ?? m?.income);

      const bills =
        num(m?.total_bills) ||
        num(m?.monthly_bills) ||
        num(m?.bills);

      const debtMinimums =
        num(m?.total_debt_minimums) ||
        num(m?.monthly_minimums) ||
        num(m?.debt_minimums);

      const historicalSpend =
        num(m?.avg_monthly_spend) ||
        num(m?.historical_monthly_spend) ||
        num(m?.average_spend) ||
        num(m?.total_spend) ||
        0;

      const monthlyNeed = bills + debtMinimums + historicalSpend;

      const today = new Date();
      const daysElapsed = today.getDate();
      const daysTotal = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();

      const daysLeft = Math.max(daysTotal - daysElapsed, 0);
      const weeksInMonth = daysTotal / 7;

      const dailyNeed = monthlyNeed / daysTotal;
      const weeklyNeed = monthlyNeed / weeksInMonth;
      const remainingNeed = Math.max(monthlyNeed - incomeSoFar, 0);

      const result = getForecast({
        name: null,
        timeframeLabel: "This Month",
        totalNeeded: monthlyNeed,
        incomeSoFar,
        daysElapsed,
        daysTotal,
      });

      setBreakdown({
        income: incomeSoFar,
        bills,
        debtMinimums,
        historicalSpend,
        monthlyNeed,
        weeklyNeed,
        dailyNeed,
        remainingNeed,
        daysTotal,
        daysElapsed,
        daysLeft,
      });

      setForecast(result);
      setLoading(false);
    }

    void loadData();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className="mx-auto max-w-4xl">
          <div className={cardClass}>
            <BenBubble message="Crunching the numbers…" mood="witty" />
            <p className="mt-4 text-sm font-semibold text-zinc-700">
              Loading your income forecast…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!forecast) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className="mx-auto max-w-4xl">
          <div className={cardClass}>
            <BenBubble
              message="I could not gather enough data to forecast your month. Add income, bills, debts, or spending so Ben has something to judge."
              mood="stern"
            />

            {message && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  const isOnTrack = forecast.projectedOnTrack;

  return (
    <main className="min-h-screen bg-transparent p-6 pb-24">
      <div className="mx-auto max-w-4xl space-y-6">
        <section className={cardClass}>
          <div className="text-xs font-black uppercase tracking-[0.2em] text-orange-700">
            AskBen Forecast
          </div>

          <h1 className="mt-2 text-3xl font-black text-zinc-950">
            Income Needed Forecast
          </h1>

          <p className="mt-2 text-sm font-semibold text-zinc-700">
            Ben estimates how much income you need daily, weekly, and monthly
            using bills, debt minimums, and historical spending.
          </p>

          <div className="mt-4">
            <BenBubble message={forecast.ben.text} mood={forecast.ben.mood} />
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm font-semibold text-amber-950">
              {message}
            </div>
          )}
        </section>

        <section className="grid gap-4 md:grid-cols-3">
          <ForecastCard
            label="Daily income needed"
            value={money(breakdown.dailyNeed)}
            helper="Needed per day this month."
            featured
          />

          <ForecastCard
            label="Weekly income needed"
            value={money(breakdown.weeklyNeed)}
            helper="Needed per week this month."
            featured
          />

          <ForecastCard
            label="Monthly income needed"
            value={money(breakdown.monthlyNeed)}
            helper="Bills + debt minimums + spending estimate."
            featured
          />
        </section>

        <section className="grid gap-4 md:grid-cols-2">
          <ForecastCard
            label="Income logged so far"
            value={money(breakdown.income)}
            helper="Income currently logged for this month. Future paychecks may still be missing."
          />

          <ForecastCard
            label="Remaining income needed"
            value={money(breakdown.remainingNeed)}
            helper="How much more income would cover the full monthly need."
          />

          <ForecastCard
            label="Bills"
            value={money(breakdown.bills)}
            helper="Required monthly bills."
          />

          <ForecastCard
            label="Debt minimums"
            value={money(breakdown.debtMinimums)}
            helper="Required minimum debt payments."
          />

          <ForecastCard
            label="Historical spend estimate"
            value={money(breakdown.historicalSpend)}
            helper="Estimated normal spending based on past/current spend."
          />

          <ForecastCard
            label="Income gap"
            value={money(forecast.incomeGap)}
            helper="Monthly need compared with income so far."
          />
        </section>

        <section className={darkCardClass}>
          <p className="text-sm font-bold text-zinc-300">Status</p>

          <p
            className={`mt-2 text-4xl font-black ${
              isOnTrack ? "text-emerald-300" : "text-orange-300"
            }`}
          >
            {isOnTrack ? "On track" : "Behind"}
          </p>

          <div className="mt-4 grid gap-3 text-sm font-semibold text-zinc-200 md:grid-cols-3">
            <div className="rounded-xl border border-white/25 bg-white/15 p-3">
              <p className="font-bold text-zinc-200">Days elapsed</p>
              <p className="mt-1 text-2xl font-black text-white">
                {breakdown.daysElapsed}
              </p>
            </div>

            <div className="rounded-xl border border-white/25 bg-white/15 p-3">
              <p className="font-bold text-zinc-200">Days left</p>
              <p className="mt-1 text-2xl font-black text-white">
                {breakdown.daysLeft}
              </p>
            </div>

            <div className="rounded-xl border border-white/25 bg-white/15 p-3">
              <p className="font-bold text-zinc-200">Days in month</p>
              <p className="mt-1 text-2xl font-black text-white">
                {breakdown.daysTotal}
              </p>
            </div>
          </div>
        </section>

        <section className={cardClass}>
          <h2 className="text-xl font-black text-zinc-950">
            How Ben calculated this
          </h2>

          <div className="mt-4 space-y-3 text-sm font-semibold text-zinc-700">
            <p>
              Monthly need = bills + debt minimums + historical spending
              estimate.
            </p>

            <p>
              Daily need = monthly need divided by the number of days in the
              current month.
            </p>

            <p>
              Weekly need = monthly need divided by the approximate number of
              weeks in the current month.
            </p>
          </div>
        </section>
      </div>
    </main>
  );
}

function ForecastCard({
  label,
  helper,
  value,
  featured = false,
}: {
  label: string;
  helper: string;
  value: string;
  featured?: boolean;
}) {
  return (
    <div
      className={
        featured
          ? "rounded-2xl border border-orange-200 bg-orange-50/95 p-5 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl"
          : cardClass
      }
    >
      <p className="text-sm font-bold text-zinc-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-zinc-950">{value}</p>
      <p className="mt-2 text-sm font-semibold text-zinc-700">{helper}</p>
    </div>
  );
}
