"use client";

import { useEffect, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { getForecast } from "@/lib/ben/forecast";
import type { BenMasterRow } from "@/lib/ben/viewTypes";

export default function ForecastPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ReturnType<typeof getForecast> | null>(
    null
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

      const { data: master, error } = await supabase
        .from("ben_master")
        .select("*")
        .eq("user_id", userId)
        .maybeSingle();

      if (error) {
        setForecast(null);
        setLoading(false);
        return;
      }

      const m = master as BenMasterRow | null;

      const totalNeeded = Number(m?.total_obligations ?? 0);
      const incomeSoFar = Number(m?.total_income ?? 0);

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
        incomeSoFar,
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
      <main className="min-h-screen p-6 bg-zinc-50/78 backdrop-blur-sm">
        <BenBubble message="Crunching the numbers…" mood="witty" />
        <p className="mt-4 text-sm text-zinc-600">Loading your forecast…</p>
      </main>
    );
  }

  if (!forecast) {
    return (
      <main className="min-h-screen p-6 bg-zinc-50/78 backdrop-blur-sm">
        <BenBubble
          message="I could not gather enough data to forecast your month. Log in and add a few entries, then come back."
          mood="stern"
        />
      </main>
    );
  }

  return (
    <main className="min-h-screen space-y-6 bg-zinc-50/78 backdrop-blur-sm p-6 pb-24">
      <BenBubble message={forecast.ben.text} mood={forecast.ben.mood} />

      <div className="grid max-w-lg grid-cols-1 gap-4">
        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Income gap (obligations vs income)</p>
          <p className="text-2xl font-semibold text-zinc-950">
            ${forecast.incomeGap.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Daily income needed</p>
          <p className="text-2xl font-semibold text-zinc-950">
            ${forecast.dailyIncomeNeeded.toFixed(2)}
          </p>
        </div>

        <div className="rounded-xl border border-zinc-200 bg-white p-4 shadow-sm">
          <p className="text-sm text-zinc-500">Status</p>
          <p
            className={`text-2xl font-semibold ${
              forecast.projectedOnTrack ? "text-emerald-600" : "text-orange-600"
            }`}
          >
            {forecast.projectedOnTrack ? "On track" : "Behind"}
          </p>
        </div>
      </div>
    </main>
  );
}
