"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { getForecast } from "@/lib/ben/forecast";
import type { BenMasterRow } from "@/lib/ben/viewTypes";

type BenMasterAny = BenMasterRow & Record<string, unknown>;

const cardClass =
  "rounded-2xl border border-white/50 bg-white/94 p-5 text-zinc-950 shadow-xl";

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

      const userId = session.user.id;

      const { data: master, error } = await supabase
        .from("ben_master")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        setMessage(error.message);
        setForecast(null);
        setLoading(false);
        return;
      }

      const m = master as BenMasterAny | null;

      const totalIncome = num(m?.total_income ?? m?.income);
      const totalSpend = num(m?.total_spend ?? m?.spend);
      const bills = num(m?.bills);
      const debtMinimums = num(m?.total_debt_minimums ?? m?.monthly_minimums);

      const totalNeeded = num(
        m?.total_obligations ?? totalSpend + bills + debtMinimums
      );

      const today = new Date();
      const daysElapsed = today.getDate();
      const daysTotal = new Date(
        today.getFullYear(),
        today.getMonth() + 1,
        0
      ).getDate();

      const result = getForecast({
        name: null,
        timeframeLabel: "Forecast",
        totalNeeded,
        incomeSoFar: totalIncome,
        daysElapsed,
        daysTotal,
      });

      setForecast(result);
      setLoading(false);
    }

    void loadData();
  }, [supabase]);

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className={cardClass}>
            <BenBubble message="Crunching the numbers…" mood="witty" />
            <p className="mt-4 text-sm text-zinc-700">
              Loading your forecast…
            </p>
          </div>
        </div>
      </main>
    );
  }

  if (!forecast) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className="mx-auto max-w-3xl space-y-4">
          <div className={cardClass}>
            <BenBubble
              message="I could not gather enough data to forecast your month. Log in and add a few entries, then come back."
              mood="stern"
            />

            {message && (
              <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
                {message}
              </div>
            )}
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-6 pb-24">
      <div className="mx-auto max-w-3xl space-y-6">
        <section className={cardClass}>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-orange-700">
            AskBen Forecast
          </div>

          <h1 className="mt-2 text-3xl font-black text-zinc-950">
            Forecast
          </h1>

          <p className="mt-2 text-sm text-zinc-700">
            Ben compares what you need this month against what has come in so
            far.
          </p>

          <div className="mt-4">
            <BenBubble message={forecast.ben.text} mood={forecast.ben.mood} />
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {message}
            </div>
          )}
        </section>

        <section className="grid gap-4">
          <ForecastCard
            label="Income gap"
            helper="Obligations compared with income so far."
            value={money(forecast.incomeGap)}
          />

          <ForecastCard
            label="Daily income needed"
            helper="What Ben thinks you need per day to stay on track."
            value={money(forecast.dailyIncomeNeeded)}
          />

          <div className={cardClass}>
            <p className="text-sm text-zinc-600">Status</p>
            <p
              className={`mt-2 text-3xl font-black ${
                forecast.projectedOnTrack
                  ? "text-emerald-700"
                  : "text-orange-700"
              }`}
            >
              {forecast.projectedOnTrack ? "On track" : "Behind"}
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
}: {
  label: string;
  helper: string;
  value: string;
}) {
  return (
    <div className={cardClass}>
      <p className="text-sm text-zinc-600">{label}</p>
      <p className="mt-2 text-3xl font-black text-zinc-950">{value}</p>
      <p className="mt-2 text-sm text-zinc-700">{helper}</p>
    </div>
  );
}
