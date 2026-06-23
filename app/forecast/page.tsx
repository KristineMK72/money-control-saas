"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { getForecast } from "@/lib/ben/forecast";
import type { BenMasterRow } from "@/lib/ben/viewTypes";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";

type BenMasterAny = BenMasterRow & Record<string, unknown>;

/* ─── Timing helper (unchanged) ─────────────────────────────────── */

function getMonthTiming() {
  const today      = new Date();
  const daysElapsed = today.getDate();
  const daysTotal  = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft   = Math.max(daysTotal - daysElapsed, 0);
  const weeksInMonth = daysTotal / 7;
  return { daysElapsed, daysTotal, daysLeft, weeksInMonth };
}

/* ─── UI primitives ─────────────────────────────────────────────── */

const CARD: React.CSSProperties = {
  background:    "rgba(15,8,4,0.88)",
  border:        "1px solid rgba(107,68,35,0.5)",
  backdropFilter:"blur(4px)",
  borderRadius:  "0.75rem",
  padding:       "1.25rem",
};

function ForecastCard({ label, value, helper, featured = false, accent = false }: {
  label: string; value: string; helper: string; featured?: boolean; accent?: boolean;
}) {
  const borderColor = featured ? "rgba(201,168,76,0.5)"
                    : accent   ? "rgba(248,113,113,0.4)"
                    : "rgba(107,68,35,0.4)";
  const bg          = featured ? "rgba(201,168,76,0.1)"
                    : accent   ? "rgba(248,113,113,0.07)"
                    : "rgba(15,8,4,0.75)";
  const valueColor  = featured ? "#c9a84c"
                    : accent   ? "#f87171"
                    : "#e8d5b7";

  return (
    <div className="rounded-xl p-4" style={{ background: bg, border: `1px solid ${borderColor}` }}>
      <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold mb-2"
         style={{ color: "#9a7d5a" }}>{label}</p>
      <p className="text-3xl font-bold font-cinzel" style={{ color: valueColor }}>{value}</p>
      <p className="mt-1.5 text-xs italic" style={{ color: "#6b4423", fontFamily: "EB Garamond, serif" }}>{helper}</p>
    </div>
  );
}

function StatBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-4 text-center"
         style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)" }}>
      <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold"
         style={{ color: "#9a7d5a" }}>{label}</p>
      <p className="mt-1 text-3xl font-bold font-cinzel" style={{ color: "#c9a84c" }}>{value}</p>
    </div>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function ForecastPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading,  setLoading]  = useState(true);
  const [forecast, setForecast] = useState<ReturnType<typeof getForecast> | null>(null);
  const [message,  setMessage]  = useState("");

  const [breakdown, setBreakdown] = useState({
    income: 0, bills: 0, debtMinimums: 0, historicalSpend: 0,
    monthlyNeed: 0, weeklyNeed: 0, dailyNeed: 0, remainingNeed: 0,
    daysTotal: 0, daysElapsed: 0, daysLeft: 0,
  });

  /* ── Data fetch (unchanged) ── */
  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError) { setMessage(sessionError.message); setLoading(false); return; }
      if (!session?.user) { setMessage("Please log in to view your forecast."); setLoading(false); return; }

      const currentMonth = currentMonthStartISO();
      const { data: master, error } = await supabase
        .from("ben_master_monthly").select("*")
        .eq("user_id", session.user.id).eq("month", currentMonth).maybeSingle();

      if (error) { setMessage(error.message); setForecast(null); setLoading(false); return; }

      const m = master as BenMasterAny | null;

      const incomeSoFar    = clampMoney(m?.total_income ?? m?.income);
      const bills          = clampMoney(m?.total_bills) || clampMoney(m?.monthly_bills) || clampMoney(m?.bills);
      const debtMinimums   = clampMoney(m?.total_debt_minimums) || clampMoney(m?.monthly_minimums) || clampMoney(m?.debt_minimums);
      const historicalSpend = clampMoney(m?.avg_monthly_spend) || clampMoney(m?.historical_monthly_spend) ||
                              clampMoney(m?.average_spend) || clampMoney(m?.total_spend);
      const monthlyNeed    = clampMoney(bills + debtMinimums + historicalSpend);

      const { daysElapsed, daysTotal, daysLeft, weeksInMonth } = getMonthTiming();
      const dailyNeed      = clampMoney(monthlyNeed / daysTotal);
      const weeklyNeed     = clampMoney(monthlyNeed / weeksInMonth);
      const remainingNeed  = clampMoney(Math.max(monthlyNeed - incomeSoFar, 0));

      const result = getForecast({
        name: null, timeframeLabel: "This Month",
        totalNeeded: monthlyNeed, incomeSoFar, daysElapsed, daysTotal,
      });

      setBreakdown({ income: incomeSoFar, bills, debtMinimums, historicalSpend,
                     monthlyNeed, weeklyNeed, dailyNeed, remainingNeed,
                     daysTotal, daysElapsed, daysLeft });
      setForecast(result);
      setLoading(false);
    }

    void loadData();
  }, [supabase]);

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-trophies bg-cover bg-center">
        <div style={{ ...CARD, padding: "2rem 3rem", textAlign: "center" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Ben is consulting the stars&hellip;
          </p>
          <BenBubble message="Crunching the numbers…" mood="witty" />
        </div>
      </div>
    );
  }

  /* ── No data ── */
  if (!forecast) {
    return (
      <div className="min-h-screen bg-ben-trophies bg-cover bg-center">
        <div className="min-h-screen flex items-center justify-center p-6"
             style={{ background: "rgba(10,5,2,0.72)" }}>
          <div style={{ ...CARD, maxWidth: "36rem", width: "100%" }}>
            <h2 className="font-cinzel text-2xl font-bold mb-4 text-center" style={{ color: "#c9a84c" }}>
              The Crystal Ball is Empty
            </h2>
            <BenBubble
              message="I could not gather enough data to forecast your month. Add income, bills, debts, or spending so Ben has something to judge."
              mood="stern"
            />
            {message && (
              <p className="mt-4 rounded-xl px-4 py-3 text-sm"
                 style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)",
                          color: "#c9a84c", fontFamily: "EB Garamond, serif" }}>
                ⚠ {message}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  const isOnTrack = forecast.projectedOnTrack;
  const progressPct = breakdown.monthlyNeed > 0
    ? Math.min(Math.round((breakdown.income / breakdown.monthlyNeed) * 100), 100)
    : 0;

  return (
    <div className="min-h-screen bg-ben-trophies bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-28" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-4xl px-4 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="text-center pt-4 pb-2">
            <p className="text-xs uppercase tracking-[0.2em] font-cinzel font-semibold"
               style={{ color: "#6b4423" }}>AskBen Forecast</p>
            <h1 className="font-cinzel text-4xl font-bold mt-1" style={{ color: "#c9a84c" }}>
              Income Needed Forecast
            </h1>
            <p className="mt-1 text-sm italic" style={{ color: "#9a7d5a" }}>
              Ben estimates how much thou must earn — daily, weekly, and monthly.
            </p>
          </div>

          {/* ── Ben&rsquo;s verdict ── */}
          <div style={CARD}>
            <BenBubble message={forecast.ben.text} mood={forecast.ben.mood} />
            {message && (
              <p className="mt-3 rounded-xl px-4 py-3 text-sm"
                 style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)",
                          color: "#c9a84c" }}>
                ✦ {message}
              </p>
            )}
          </div>

          {/* ── Status banner ── */}
          <div className="rounded-xl px-6 py-5 flex flex-col sm:flex-row sm:items-center gap-4"
               style={{
                 background: isOnTrack ? "rgba(74,222,128,0.08)" : "rgba(248,113,113,0.08)",
                 border: `1px solid ${isOnTrack ? "rgba(74,222,128,0.35)" : "rgba(248,113,113,0.35)"}`,
               }}>
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold"
                 style={{ color: "#9a7d5a" }}>Monthly Status</p>
              <p className="text-4xl font-bold font-cinzel mt-1"
                 style={{ color: isOnTrack ? "#4ade80" : "#f87171" }}>
                {isOnTrack ? "On Track ✦" : "Behind ⚠"}
              </p>
              <p className="text-sm italic mt-1" style={{ color: "#9a7d5a" }}>
                {progressPct}% of monthly need covered so far
              </p>
            </div>

            {/* Progress arc */}
            <div className="shrink-0">
              <div className="w-24 h-24 rounded-full flex items-center justify-center"
                   style={{ background: `conic-gradient(${isOnTrack ? "#4ade80" : "#f87171"} ${progressPct * 3.6}deg, rgba(107,68,35,0.3) 0deg)` }}>
                <div className="w-16 h-16 rounded-full flex items-center justify-center"
                     style={{ background: "rgba(10,5,2,0.9)" }}>
                  <span className="font-cinzel text-sm font-bold"
                        style={{ color: isOnTrack ? "#4ade80" : "#f87171" }}>{progressPct}%</span>
                </div>
              </div>
            </div>
          </div>

          {/* ── Featured: daily / weekly / monthly need ── */}
          <div className="grid gap-3 md:grid-cols-3">
            <ForecastCard
              label="Daily Income Needed"
              value={money(breakdown.dailyNeed)}
              helper="Needed per day this month."
              featured
            />
            <ForecastCard
              label="Weekly Income Needed"
              value={money(breakdown.weeklyNeed)}
              helper="Needed per week this month."
              featured
            />
            <ForecastCard
              label="Monthly Income Needed"
              value={money(breakdown.monthlyNeed)}
              helper="Bills + debt minimums + spending estimate."
              featured
            />
          </div>

          {/* ── Detail grid ── */}
          <div className="grid gap-3 md:grid-cols-2">
            <ForecastCard
              label="Income Logged So Far"
              value={money(breakdown.income)}
              helper="Income currently logged for this month."
            />
            <ForecastCard
              label="Remaining Income Needed"
              value={money(breakdown.remainingNeed)}
              helper="How much more income would cover the full monthly need."
              accent={breakdown.remainingNeed > 0}
            />
            <ForecastCard
              label="Bills"
              value={money(breakdown.bills)}
              helper="Required monthly bills."
            />
            <ForecastCard
              label="Debt Minimums"
              value={money(breakdown.debtMinimums)}
              helper="Required minimum debt payments."
            />
            <ForecastCard
              label="Spending Estimate"
              value={money(breakdown.historicalSpend)}
              helper="Estimated normal spending based on available data."
            />
            <ForecastCard
              label="Income Gap"
              value={money(forecast.incomeGap)}
              helper="Monthly need compared with income so far."
              accent={forecast.incomeGap > 0}
            />
          </div>

          {/* ── Month timeline ── */}
          <div style={CARD}>
            <h3 className="font-cinzel text-sm font-bold uppercase tracking-widest mb-4"
                style={{ color: "#c9a84c" }}>Month Timeline</h3>

            {/* Timeline bar */}
            <div className="mb-4">
              <div className="flex justify-between text-[10px] font-cinzel mb-1"
                   style={{ color: "#9a7d5a" }}>
                <span>Day 1</span>
                <span>Today (Day {breakdown.daysElapsed})</span>
                <span>Day {breakdown.daysTotal}</span>
              </div>
              <div className="h-3 rounded-full overflow-hidden"
                   style={{ background: "rgba(107,68,35,0.3)", border: "1px solid rgba(107,68,35,0.4)" }}>
                <div className="h-full rounded-full transition-all duration-700"
                     style={{
                       width: `${Math.round((breakdown.daysElapsed / breakdown.daysTotal) * 100)}%`,
                       background: "linear-gradient(90deg, #8b6914, #c9a84c)",
                     }} />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <StatBox label="Days Elapsed" value={breakdown.daysElapsed} />
              <StatBox label="Days Left"    value={breakdown.daysLeft}    />
              <StatBox label="Days in Month" value={breakdown.daysTotal}  />
            </div>
          </div>

          {/* ── How Ben calculated this ── */}
          <div style={CARD}>
            <h3 className="font-cinzel text-sm font-bold uppercase tracking-widest mb-4"
                style={{ color: "#c9a84c" }}>
              🪶 How Ben Calculated This
            </h3>
            <div className="space-y-3 text-sm leading-relaxed" style={{ color: "#9a7d5a" }}>
              <p>
                <span style={{ color: "#c9a84c" }}>Monthly need</span> = bills + debt minimums + spending estimate.
              </p>
              <p>
                <span style={{ color: "#c9a84c" }}>Daily need</span> = monthly need divided by the number of days in the current month.
              </p>
              <p>
                <span style={{ color: "#c9a84c" }}>Weekly need</span> = monthly need divided by the number of weeks in the current month.
              </p>
              <p>
                <span style={{ color: "#c9a84c" }}>Remaining need</span> = monthly need minus income logged so far.
              </p>
            </div>
          </div>

          {/* ── Quote ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;By failing to prepare, you are preparing to fail.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
