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

      // Load obligations
      const { data: obligations } = await supabase
        .from("obligations")
        .select("amount")
        .eq("user_id", userId);

      const total = obligations?.reduce(
        (sum, item) => sum + (item.amount || 0),
        0
      );

      setTotalNeeded(total || 0);

      // Load income
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
      <div className="p-6">
        <BenBubble text="Crunching the numbers…" mood="witty" />
        <p className="text-gray-400 mt-4">Loading your forecast…</p>
      </div>
    );
  }

  if (!forecast) {
    return (
      <div className="p-6">
        <BenBubble
          text="I could not gather enough data to forecast your month."
          mood="stern"
        />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6 pb-24">
      {/* Ben Narrator */}
      <BenBubble text={forecast.ben.text} mood={forecast.ben.mood} />

      {/* Forecast Metrics */}
      <div className="grid grid-cols-1 gap-4">
        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-gray-400 text-sm">Income Gap</p>
          <p className="text-2xl font-semibold text-white">
            ${forecast.incomeGap.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-gray-400 text-sm">Daily Income Needed</p>
          <p className="text-2xl font-semibold text-white">
            ${forecast.dailyIncomeNeeded.toFixed(2)}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-white/5 border border-white/10">
          <p className="text-gray-400 text-sm">Status</p>
          <p
            className={`text-2xl font-semibold ${
              forecast.projectedOnTrack ? "text-green-400" : "text-orange-400"
            }`}
          >
            {forecast.projectedOnTrack ? "On Track" : "Behind"}
          </p>
        </div>
      </div>

      {/* Floating AI Bubble */}
      <BenPersona />
    </div>
  );
}
