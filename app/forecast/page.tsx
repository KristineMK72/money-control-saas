"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { getForecast } from "@/lib/ben/forecast";
import { clampMoney, money, addMoney } from "@/lib/money/math";

const OBSERVATORY_BG = "/3F884A47-5FC6-4FEC-8F4C-7EF673CB444F.png";

type TrendRow = {
  month: string;
  label: string;
  income: number;
  spend: number;
  net: number;
};

function monthStart(offset = 0) {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth() + offset, 1);
}

function isoDate(d: Date) {
  return d.toISOString().slice(0, 10);
}

function monthKey(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
}

function monthLabel(d: Date) {
  return d.toLocaleDateString(undefined, { month: "short" });
}

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

export default function ForecastPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [showBenNotice, setShowBenNotice] = useState(false);
  const [trend, setTrend] = useState<TrendRow[]>([]);

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

  const forecast = getForecast({
    name: null,
    timeframeLabel: "This Month",
    totalNeeded: breakdown.monthlyNeed,
    incomeSoFar: breakdown.income,
    daysElapsed: breakdown.daysElapsed || 1,
    daysTotal: breakdown.daysTotal || 30,
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

      const userId = session.user.id;
      const nowStart = monthStart(0);
      const nextStart = monthStart(1);
      const firstTrendMonth = monthStart(-5);

      const [
        incomeRes,
        spendRes,
        billsRes,
        debtsRes,
      ] = await Promise.all([
        supabase
          .from("income_entries")
          .select("amount, date_iso")
          .eq("user_id", userId)
          .gte("date_iso", isoDate(firstTrendMonth))
          .lt("date_iso", isoDate(nextStart)),

        supabase
          .from("spend_entries")
          .select("amount, date_iso")
          .eq("user_id", userId)
          .gte("date_iso", isoDate(firstTrendMonth))
          .lt("date_iso", isoDate(nextStart)),

        supabase
          .from("bills")
          .select("target, monthly_target")
          .eq("user_id", userId),

        supabase
          .from("debts")
          .select("min_payment, monthly_min_payment")
          .eq("user_id", userId),
      ]);

      if (incomeRes.error) setMessage(incomeRes.error.message);
      if (spendRes.error) setMessage(spendRes.error.message);
      if (billsRes.error) setMessage(billsRes.error.message);
      if (debtsRes.error) setMessage(debtsRes.error.message);

      const incomeRows = incomeRes.data || [];
      const spendRows = spendRes.data || [];

      const currentIncome = addMoney(
        incomeRows
          .filter((r) => r.date_iso >= isoDate(nowStart))
          .map((r) => clampMoney(r.amount))
      );

      const currentSpend = addMoney(
        spendRows
          .filter((r) => r.date_iso >= isoDate(nowStart))
          .map((r) => clampMoney(r.amount))
      );

      const monthlyBills = addMoney(
        (billsRes.data || []).map((b) => clampMoney(b.monthly_target ?? b.target))
      );

      const debtMinimums = addMoney(
        (debtsRes.data || []).map((d) =>
          clampMoney(d.monthly_min_payment ?? d.min_payment)
        )
      );

      const months: TrendRow[] = Array.from({ length: 6 }, (_, i) => {
        const start = monthStart(i - 5);
        const end = monthStart(i - 4);
        const startIso = isoDate(start);
        const endIso = isoDate(end);

        const income = addMoney(
          incomeRows
            .filter((r) => r.date_iso >= startIso && r.date_iso < endIso)
            .map((r) => clampMoney(r.amount))
        );

        const spend = addMoney(
          spendRows
            .filter((r) => r.date_iso >= startIso && r.date_iso < endIso)
            .map((r) => clampMoney(r.amount))
        );

        return {
          month: monthKey(start),
          label: monthLabel(start),
          income,
          spend,
          net: income - spend,
        };
      });

      const pastSpendMonths = months.slice(0, 5).filter((m) => m.spend > 0);
      const avgHistoricalSpend =
        pastSpendMonths.length > 0
          ? clampMoney(addMoney(pastSpendMonths.map((m) => m.spend)) / pastSpendMonths.length)
          : currentSpend;

      const { daysElapsed, daysTotal, daysLeft, weeksInMonth } = getMonthTiming();

      const monthlyNeed = clampMoney(monthlyBills + debtMinimums + avgHistoricalSpend);
      const dailyNeed = clampMoney(monthlyNeed / daysTotal);
      const weeklyNeed = clampMoney(monthlyNeed / weeksInMonth);
      const remainingNeed = clampMoney(Math.max(monthlyNeed - currentIncome, 0));

      setTrend(months);

      setBreakdown({
        income: currentIncome,
        bills: monthlyBills,
        debtMinimums,
        historicalSpend: avgHistoricalSpend,
        monthlyNeed,
        weeklyNeed,
        dailyNeed,
        remainingNeed,
        daysTotal,
        daysElapsed,
        daysLeft,
      });

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

  const isOnTrack = forecast.projectedOnTrack;

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
          style={{ background: "rgba(0,0,0,.72)", border: "1px solid rgba(201,168,76,.45)" }}
        >
          ← Back to Town
        </button>

        <button
          onClick={() => setShowBenNotice(true)}
          className="absolute right-4 top-4 rounded-full px-4 py-2 text-sm"
          style={{ background: "rgba(0,0,0,.72)", border: "1px solid rgba(201,168,76,.45)" }}
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
              Ben consults the stars, the ledger, and thy past months.
            </p>
          </div>

          {message && (
            <div className="mb-4 rounded-xl px-4 py-3 text-center text-sm text-[#c9a84c]"
              style={{ background: "rgba(201,168,76,.12)", border: "1px solid rgba(201,168,76,.35)" }}>
              ✦ {message}
            </div>
          )}

          <div
            className="mb-5 rounded-2xl p-5 text-center"
            style={{
              background: isOnTrack ? "rgba(74,222,128,.08)" : "rgba(248,113,113,.08)",
              border: `1px solid ${isOnTrack ? "rgba(74,222,128,.35)" : "rgba(248,113,113,.35)"}`,
            }}
          >
            <p className="font-cinzel text-xs uppercase tracking-widest text-[#9a7d5a]">
              Monthly Status
            </p>
            <p className="font-cinzel text-4xl font-bold" style={{ color: isOnTrack ? "#4ade80" : "#f87171" }}>
              {isOnTrack ? "On Track ✦" : "Behind ⚠"}
            </p>
            <p className="text-sm italic text-[#d6c09a]">{progressPct}% of monthly need covered so far</p>
          </div>

          <div className="mb-6 grid grid-cols-1 overflow-hidden rounded-2xl sm:grid-cols-3"
            style={{ border: "1px solid rgba(201,168,76,.4)", background: "rgba(0,0,0,.58)" }}>
            <Metric icon="☀️" label="Daily Needed" value={money(breakdown.dailyNeed)} />
            <Metric icon="🌙" label="Weekly Needed" value={money(breakdown.weeklyNeed)} />
            <Metric icon="⭐" label="Monthly Needed" value={money(breakdown.monthlyNeed)} />
          </div>

          <div className="mb-6 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
            style={{ border: "1px solid rgba(201,168,76,.4)", background: "rgba(0,0,0,.58)" }}>
            <Metric icon="🪙" label="Income Logged" value={money(breakdown.income)} color="#4ade80" />
            <Metric icon="📜" label="Bills" value={money(breakdown.bills)} />
            <Metric icon="⚖️" label="Debt Minimums" value={money(breakdown.debtMinimums)} />
            <Metric icon="🔥" label="Remaining Need" value={money(breakdown.remainingNeed)} color={breakdown.remainingNeed > 0 ? "#f87171" : "#4ade80"} />
          </div>

          <div className="mb-6 rounded-2xl p-5"
            style={{ border: "1px solid rgba(201,168,76,.35)", background: "rgba(0,0,0,.55)" }}>
            <h2 className="mb-4 font-cinzel text-lg font-bold text-[#c9a84c]">
              Six-Month Trend
            </h2>

            <div className="space-y-3">
              {trend.map((m) => {
                const max = Math.max(...trend.map((t) => Math.max(t.income, t.spend)), 1);
                const incomePct = Math.min((m.income / max) * 100, 100);
                const spendPct = Math.min((m.spend / max) * 100, 100);

                return (
                  <div key={m.month}>
                    <div className="mb-1 flex justify-between text-xs text-[#d6c09a]">
                      <span className="font-cinzel">{m.label}</span>
                      <span>{money(m.net)} net</span>
                    </div>

                    <div className="space-y-1">
                      <div className="h-2 overflow-hidden rounded-full bg-[#1f1207]">
                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${incomePct}%` }} />
                      </div>
                      <div className="h-2 overflow-hidden rounded-full bg-[#1f1207]">
                        <div className="h-full rounded-full bg-red-500" style={{ width: `${spendPct}%` }} />
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <p className="mt-3 text-xs italic text-[#9a7d5a]">
              Green = income. Red = spending. Ben uses past spending to estimate future need.
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <button onClick={() => router.push("/income")} className="rounded-xl py-4 font-cinzel text-lg"
              style={{ background: "#166534", border: "1px solid #4ade80" }}>
              + Add Income
            </button>

            <button onClick={() => setShowBenNotice(true)} className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}>
              🔭 How Ben Calculated
            </button>

            <button onClick={() => router.push("/world")} className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.35)" }}>
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
          <div className="max-w-md rounded-3xl p-5"
            style={{ background: "#fff7df", border: "2px solid #c9a84c", color: "#1a0f0a" }}>
            <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#8a3a12]">
              Ben&apos;s Forecast
            </p>

            <p className="mt-3 text-lg font-bold leading-snug">
              {forecast.ben.text}
            </p>

            <div className="mt-4 space-y-2 text-sm">
              <p><b>Monthly need</b> = bills + debt minimums + historical spending average.</p>
              <p><b>Historical spending</b> comes from the previous months in your spend ledger.</p>
              <p><b>Remaining need</b> = monthly need minus income logged this month.</p>
            </div>

            <button onClick={() => setShowBenNotice(false)} className="mt-5 w-full rounded-xl py-3 font-bold"
              style={{ background: "#1a0f0a", color: "#f5e6c8" }}>
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}
