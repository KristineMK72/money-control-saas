"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getForecast } from "@/lib/ben/forecast";
import type { BenMasterRow } from "@/lib/ben/viewTypes";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";

const OBSERVATORY_BG = "/3F884A47-5FC6-4FEC-8F4C-7EF673CB444F.png";

type BenMasterAny = BenMasterRow & Record<string, unknown>;

function getMonthTiming() {
  const today = new Date();
  const daysElapsed = today.getDate();
  const daysTotal = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
  const daysLeft = Math.max(daysTotal - daysElapsed, 0);
  const weeksInMonth = daysTotal / 7;
  return { daysElapsed, daysTotal, daysLeft, weeksInMonth };
}

function Metric({
  icon,
  label,
  value,
  color = "#c9a84c",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border-b border-[#c9a84c]/20 p-4 text-center last:border-r-0 sm:border-b-0 sm:border-r">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#d6c09a]">{label}</p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function SmallBox({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl p-3 text-center" style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.25)" }}>
      <p className="text-[10px] uppercase tracking-widest text-[#9a7d5a]">{label}</p>
      <p className="text-2xl font-bold text-[#c9a84c]">{value}</p>
    </div>
  );
}

export default function ForecastPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<ReturnType<typeof getForecast> | null>(null);
  const [message, setMessage] = useState("");
  const [showBenNotice, setShowBenNotice] = useState(false);

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

      const currentMonth = currentMonthStartISO();

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

      const incomeSoFar = clampMoney(m?.total_income ?? m?.income);
      const bills =
        clampMoney(m?.total_bills) ||
        clampMoney(m?.monthly_bills) ||
        clampMoney(m?.bills);

      const debtMinimums =
        clampMoney(m?.total_debt_minimums) ||
        clampMoney(m?.monthly_minimums) ||
        clampMoney(m?.debt_minimums);

      const historicalSpend =
        clampMoney(m?.avg_monthly_spend) ||
        clampMoney(m?.historical_monthly_spend) ||
        clampMoney(m?.average_spend) ||
        clampMoney(m?.total_spend);

      const monthlyNeed = clampMoney(bills + debtMinimums + historicalSpend);
      const { daysElapsed, daysTotal, daysLeft, weeksInMonth } = getMonthTiming();

      const dailyNeed = clampMoney(monthlyNeed / daysTotal);
      const weeklyNeed = clampMoney(monthlyNeed / weeksInMonth);
      const remainingNeed = clampMoney(Math.max(monthlyNeed - incomeSoFar, 0));

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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-cinzel text-[#c9a84c]">Ben is consulting the stars…</p>
      </div>
    );
  }

  const isOnTrack = forecast?.projectedOnTrack ?? false;

  const progressPct =
    breakdown.monthlyNeed > 0
      ? Math.min(Math.round((breakdown.income / breakdown.monthlyNeed) * 100), 100)
      : 0;

  return (
    <main className="min-h-screen bg-black text-[#f5e6c8]" style={{ fontFamily: "EB Garamond, serif" }}>
      <section className="relative mx-auto max-w-5xl">
        <img src={OBSERVATORY_BG} alt="Observatory Forecast" className="block h-auto w-full" />

        <button
          onClick={() => router.push("/world")}
          className="absolute left-4 top-4 rounded-full px-4 py-2 text-sm"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          ← Back to Town
        </button>

        <button
          onClick={() => setShowBenNotice(true)}
          className="absolute right-4 top-4 rounded-full px-4 py-2 text-sm"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          Ben&apos;s Forecast
        </button>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-28 -mt-3 sm:-mt-10">
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(8,5,3,.94), rgba(0,0,0,.99))",
            border: "1px solid rgba(201,168,76,.35)",
            boxShadow: "0 -30px 80px rgba(0,0,0,.9)",
          }}
        >
          <div className="mb-5 text-center">
            <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-[#c9a84c]">
              AskBen Observatory
            </p>
            <h1 className="font-cinzel text-4xl font-bold text-[#f5e6c8]">
              The Observatory Forecast
            </h1>
            <p className="text-sm italic text-[#d6c09a]">
              Ben consults the stars, the ledger, and the month ahead.
            </p>
          </div>

          {message && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-center text-sm"
              style={{
                background: "rgba(201,168,76,.12)",
                border: "1px solid rgba(201,168,76,.35)",
                color: "#c9a84c",
              }}
            >
              ✦ {message}
            </div>
          )}

          <div
            className="mb-5 flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center"
            style={{
              background: isOnTrack ? "rgba(74,222,128,.08)" : "rgba(248,113,113,.08)",
              border: `1px solid ${isOnTrack ? "rgba(74,222,128,.35)" : "rgba(248,113,113,.35)"}`,
            }}
          >
            <div className="flex-1 text-center sm:text-left">
              <p className="font-cinzel text-xs uppercase tracking-widest text-[#9a7d5a]">
                Monthly Status
              </p>
              <p
                className="font-cinzel text-4xl font-bold"
                style={{ color: isOnTrack ? "#4ade80" : "#f87171" }}
              >
                {isOnTrack ? "On Track ✦" : "Behind ⚠"}
              </p>
              <p className="text-sm italic text-[#d6c09a]">
                {progressPct}% of monthly need covered so far
              </p>
            </div>

            <div className="mx-auto h-24 w-24 rounded-full p-2"
              style={{
                background: `conic-gradient(${isOnTrack ? "#4ade80" : "#f87171"} ${progressPct * 3.6}deg, rgba(107,68,35,.35) 0deg)`,
              }}
            >
              <div className="flex h-full w-full items-center justify-center rounded-full bg-black">
                <span className="font-cinzel font-bold" style={{ color: isOnTrack ? "#4ade80" : "#f87171" }}>
                  {progressPct}%
                </span>
              </div>
            </div>
          </div>

          <div
            className="mb-6 grid grid-cols-1 overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ border: "1px solid rgba(201,168,76,.4)", background: "rgba(0,0,0,.58)" }}
          >
            <Metric icon="☀️" label="Daily Needed" value={money(breakdown.dailyNeed)} />
            <Metric icon="🌙" label="Weekly Needed" value={money(breakdown.weeklyNeed)} />
            <Metric icon="⭐" label="Monthly Needed" value={money(breakdown.monthlyNeed)} />
          </div>

          <div
            className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
            style={{ border: "1px solid rgba(201,168,76,.4)", background: "rgba(0,0,0,.58)" }}
          >
            <Metric icon="🪙" label="Income Logged" value={money(breakdown.income)} color="#4ade80" />
            <Metric icon="📜" label="Bills" value={money(breakdown.bills)} />
            <Metric icon="⚖️" label="Debt Minimums" value={money(breakdown.debtMinimums)} />
            <Metric icon="🔥" label="Remaining Need" value={money(breakdown.remainingNeed)} color={breakdown.remainingNeed > 0 ? "#f87171" : "#4ade80"} />
          </div>

          <div
            className="mb-6 rounded-2xl p-5"
            style={{ border: "1px solid rgba(201,168,76,.35)", background: "rgba(0,0,0,.55)" }}
          >
            <h2 className="mb-3 font-cinzel text-lg font-bold text-[#c9a84c]">
              Month Timeline
            </h2>

            <div className="mb-3 flex justify-between text-[10px] uppercase tracking-widest text-[#9a7d5a]">
              <span>Day 1</span>
              <span>Today: Day {breakdown.daysElapsed}</span>
              <span>Day {breakdown.daysTotal}</span>
            </div>

            <div className="h-3 overflow-hidden rounded-full bg-[#3a210e]">
              <div
                className="h-full rounded-full"
                style={{
                  width: `${Math.round((breakdown.daysElapsed / breakdown.daysTotal) * 100)}%`,
                  background: "linear-gradient(90deg, #8b6914, #c9a84c)",
                }}
              />
            </div>

            <div className="mt-4 grid grid-cols-3 gap-3">
              <SmallBox label="Elapsed" value={breakdown.daysElapsed} />
              <SmallBox label="Left" value={breakdown.daysLeft} />
              <SmallBox label="Month" value={breakdown.daysTotal} />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button
              onClick={() => router.push("/income")}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ background: "#166534", border: "1px solid #4ade80" }}
            >
              + Add Income
            </button>

            <button
              onClick={() => setShowBenNotice(true)}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              🔭 How Ben Calculated
            </button>

            <button
              onClick={() => router.push("/world")}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}
            >
              ↪ Exit to Town
            </button>
          </div>

          <p className="mt-6 text-center italic text-[#c9a84c]">
            “By failing to prepare, you are preparing to fail.” — Benjamin Franklin
          </p>
        </div>
      </section>

      {showBenNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div
            className="max-w-md rounded-3xl p-5"
            style={{
              background: "#fff7df",
              border: "2px solid #c9a84c",
              color: "#1a0f0a",
              boxShadow: "0 30px 80px rgba(0,0,0,.7)",
            }}
          >
            <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#8a3a12]">
              Ben&apos;s Forecast
            </p>

            <p className="mt-3 text-lg font-bold leading-snug">
              {forecast?.ben.text ?? "Ben is still studying the stars."}
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <p><b>Monthly need</b> = bills + debt minimums + spending estimate.</p>
              <p><b>Daily need</b> = monthly need divided by days in the month.</p>
              <p><b>Remaining need</b> = monthly need minus income logged so far.</p>
            </div>

            <button
              onClick={() => setShowBenNotice(false)}
              className="mt-5 w-full rounded-xl py-3 font-bold"
              style={{ background: "#1a0f0a", color: "#f5e6c8" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
