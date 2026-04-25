"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import BenBubble from "@/components/BenBubble";
import BenPersona from "@/components/BenPersona";
import { getForecast } from "@/lib/ben/forecast";

export default function ForecastPage() {
  const supabase = createClientComponentClient();

  const [loading, setLoading] = useState(true);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [incomeSoFar, setIncomeSoFar] = useState(0);
  const [forecast, setForecast] = useState(null);

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

      // Obligations
      const { data: obligations } = await supabase
        .from("obligations")
        .select("amount")
        .eq("user_id", userId);

      const total = obligations?.reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );

      setTotalNeeded(total || 0);

      // Income
      const { data: income } = await supabase
        .from("income")
        .select("amount")
        .eq("user_id", userId);

      const incomeTotal = income?.reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );

      setIncomeSoFar(incomeTotal || 0);

      // Forecast math
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
        totalNeeded: total || 0,
        incomeSoFar: incomeTotal || 0,
        daysElapsed,
        daysTotal,
      });

      setForecast(result);
      setLoading(false);
    }

    loadData();
  }, []);

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

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-24">

        {/* Header */}
        <header>
          <h1 className="text-2xl font-semibold tracking-tight">Forecast</h1>
          <p className="text-xs text-zinc-400">
            Ben’s projection of your cashflow for the rest of the month.
          </p>
        </header>

        {/* Ben Narration */}
        <BenBubble text={forecast.ben.text} mood={forecast.ben.mood} />

        {/* Chart Placeholder */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
          <div className="text-xs font-semibold text-zinc-400">
            30‑day cash trajectory
          </div>
          <div className="h-48 rounded-xl bg-zinc-950/60 border border-zinc-800 flex items-center justify-center text-xs text-zinc-500">
            Chart coming soon
          </div>
        </section>

        {/* Forecast Metrics */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <p className="text-xs text-zinc-400">Income Gap</p>
            <p className="text-2xl font-semibold text-white">
              ${forecast.incomeGap.toFixed(2)}
            </p>
          </div>

          <div className="p-4 rounded-2xl bg-zinc-900/70 border border-zinc-800">
            <p className="text-xs text-zinc-400">Daily Income Needed</p>
            <p className="text-2xl font-semibold text-white">
              ${forecast.dailyIncomeNeeded.toFixed(2)}
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

        {/* Ben Persona */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4">
          <BenPersona />
        </section>
      </div>
    </main>
  );
}
