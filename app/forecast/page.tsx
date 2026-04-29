"use client";

import { useEffect, useMemo, useState } from "react";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  ReferenceLine,
} from "recharts";
import { createSupabaseBrowserClient } from "@/lib/supabase/browser";
import BenBubble from "@/components/BenBubble";
import BenPersona from "@/components/BenPersona";
import { getForecast } from "@/lib/ben/forecast";

/* ─────────────────────────────
   TYPES
──────────────────────────── */
type Bill = {
  id: string;
  user_id: string;
  amount: number | null;
  target: number | null;
  monthly_target: number | null;
  min_payment: number | null;
  due_day?: number | null;
  name?: string | null;
};

type Debt = {
  id: string;
  user_id: string;
  min_payment: number | null;
  due_day?: number | null;
  name?: string | null;
};

type IncomeEntry = {
  id: string;
  user_id: string;
  amount: number;
  date_iso: string | null;
  received_on: string | null;
  created_at: string;
};

type SpendEntry = {
  id: string;
  user_id: string;
  amount: number | null;
  created_at: string | null;
};

/* ─────────────────────────────
   HELPERS
──────────────────────────── */
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

function formatMoney(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  });
}

/* ─────────────────────────────
   HEALTH RING
──────────────────────────── */
function HealthRing({ score }: { score: number }) {
  const radius = 56;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;

  const color =
    score >= 75 ? "#34d399" : score >= 50 ? "#facc15" : score >= 25 ? "#fb923c" : "#f87171";

  return (
    <div className="relative w-36 h-36 flex items-center justify-center">
      <svg className="w-full h-full -rotate-90" viewBox="0 0 140 140">
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke="#27272a"
          strokeWidth="10"
          fill="none"
        />
        <circle
          cx="70"
          cy="70"
          r={radius}
          stroke={color}
          strokeWidth="10"
          fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease-out" }}
        />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <span className="text-3xl font-bold text-white">{score}</span>
        <span className="text-[10px] uppercase tracking-wider text-zinc-500">
          Health
        </span>
      </div>
    </div>
  );
}

/* ─────────────────────────────
   PAGE
──────────────────────────── */
export default function ForecastPage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [totalNeeded, setTotalNeeded] = useState(0);
  const [incomeSoFar, setIncomeSoFar] = useState(0);
  const [spendSoFar, setSpendSoFar] = useState(0);
  const [forecast, setForecast] = useState<any | null>(null);
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendEntry[]>([]);

  const [timeframe, setTimeframe] = useState<"day" | "week" | "month" | "year">(
    "month"
  );

  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        setLoading(false);
        return;
      }

      const userId = user.id;
      const today = new Date();

      const [
        { data: billsData },
        { data: debtsData },
        { data: incomeData },
        { data: spendData },
      ] = await Promise.all([
        supabase
          .from("bills")
          .select("id,name,amount,target,monthly_target,min_payment,due_day,user_id")
          .eq("user_id", userId),
        supabase
          .from("debts")
          .select("id,name,min_payment,due_day,user_id")
          .eq("user_id", userId),
        supabase
          .from("income_entries")
          .select("id,amount,date_iso,received_on,created_at,user_id")
          .eq("user_id", userId),
        supabase
          .from("spend_entries")
          .select("id,amount,created_at,user_id")
          .eq("user_id", userId),
      ]);

      const billsSafe = (billsData || []) as Bill[];
      const debtsSafe = (debtsData || []) as Debt[];
      const incomeSafe = (incomeData || []) as IncomeEntry[];
      const spendSafe = (spendData || []) as SpendEntry[];

      setBills(billsSafe);
      setDebts(debtsSafe);
      setIncomeEntries(incomeSafe);
      setSpendEntries(spendSafe);

      const billsTotal = billsSafe.reduce((s, b) => s + getMonthlyBillAmount(b), 0);
      const debtMinTotal = debtsSafe.reduce((s, d) => s + (d.min_payment || 0), 0);
      const totalObligations = billsTotal + debtMinTotal;
      setTotalNeeded(totalObligations);

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

      const spendTotal = spendSafe.reduce((sum, s) => {
        if (!s.created_at) return sum;
        const date = new Date(s.created_at);
        if (!isNaN(date.getTime()) && isSameMonth(date, today)) {
          return sum + (s.amount || 0);
        }
        return sum;
      }, 0);
      setSpendSoFar(spendTotal);

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
      });

      setForecast(result);
      setLoading(false);
    }

    loadData();
  }, [supabase, timeframe]);

  /* ───────── Build trajectory chart data ───────── */
  const chartData = useMemo(() => {
    const today = new Date();
    const daysElapsed = today.getDate();
    const daysTotal = new Date(
      today.getFullYear(),
      today.getMonth() + 1,
      0
    ).getDate();

    const dailyIncomeRate = daysElapsed > 0 ? incomeSoFar / daysElapsed : 0;
    const dailySpendRate = daysElapsed > 0 ? spendSoFar / daysElapsed : 0;

    let horizon = 30;
    if (timeframe === "day") horizon = 7;
    if (timeframe === "week") horizon = 84;
    if (timeframe === "year") horizon = 365;

    const billDueDays = new Set<number>();
    bills.forEach((b) => {
      if (b.due_day) billDueDays.add(b.due_day);
    });
    debts.forEach((d) => {
      if (d.due_day) billDueDays.add(d.due_day);
    });

    const points: { day: string; cash: number; obligations: number }[] = [];
    let runningCash = incomeSoFar - spendSoFar;
    let runningObligations = 0;

    for (let i = 0; i < horizon; i++) {
      const date = new Date(today);
      date.setDate(today.getDate() + i);
      const dayOfMonth = date.getDate();

      runningCash += dailyIncomeRate - dailySpendRate;

      if (billDueDays.has(dayOfMonth)) {
        const dueToday =
          bills
            .filter((b) => b.due_day === dayOfMonth)
            .reduce((s, b) => s + getMonthlyBillAmount(b), 0) +
          debts
            .filter((d) => d.due_day === dayOfMonth)
            .reduce((s, d) => s + (d.min_payment || 0), 0);
        runningCash -= dueToday;
        runningObligations += dueToday;
      }

      points.push({
        day:
          horizon > 60
            ? date.toLocaleDateString("en-US", { month: "short" })
            : date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
        cash: Math.round(runningCash),
        obligations: Math.round(runningObligations),
      });
    }

    return points;
  }, [bills, debts, incomeSoFar, spendSoFar, timeframe]);

  /* ───────── Loading State ───────── */
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
            text="I couldn't gather enough data to forecast your month."
            mood="stern"
          />
        </div>
      </main>
    );
  }

  /* ───────── Health Score ───────── */
  const healthScore = (() => {
    let score = 100;
    if (!forecast.projectedOnTrack) score -= 25;
    if (forecast.incomeGap > 0) score -= Math.min(25, forecast.incomeGap / 10);
    if (forecast.dailyIncomeNeeded > 50) score -= 20;
    return Math.max(0, Math.round(score));
  })();

  const safeMood = ["encouraging", "urgent", "stern", "witty", "celebratory"].includes(
    forecast.ben.mood
  )
    ? forecast.ben.mood
    : "witty";

  const chartLabel =
    timeframe === "day"
      ? "Next 7 days cash trajectory"
      : timeframe === "week"
      ? "Next 12 weeks cash trajectory"
      : timeframe === "year"
      ? "12‑month cash trajectory"
      : "30‑day cash trajectory";

  const incomeProgress =
    totalNeeded > 0 ? Math.min(100, (incomeSoFar / totalNeeded) * 100) : 0;

  const lowestPoint = chartData.reduce(
    (lo, p) => (p.cash < lo.cash ? p : lo),
    chartData[0] || { day: "", cash: 0, obligations: 0 }
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-8 pb-24">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-emerald-300 to-cyan-300 bg-clip-text text-transparent">
              Forecast
            </h1>
            <p className="text-sm text-zinc-400 mt-1">
              Ben's projection of your cashflow and obligations.
            </p>
          </div>

          {/* Timeframe Toggle */}
          <div className="flex items-center gap-1 bg-zinc-900 border border-zinc-800 rounded-full p-1 text-xs">
            {(["day", "week", "month", "year"] as const).map((t) => (
              <button
                key={t}
                onClick={() => setTimeframe(t)}
                className={`rounded-full px-3 py-1.5 transition ${
                  timeframe === t
                    ? "bg-emerald-400 text-black font-semibold"
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                {t[0].toUpperCase() + t.slice(1)}
              </button>
            ))}
          </div>
        </header>

        {/* Ben Narration */}
        <BenBubble text={forecast.ben.text} mood={safeMood as any} />

        {/* Hero: Health Ring + Progress */}
        <section className="rounded-2xl border border-zinc-800 bg-gradient-to-br from-zinc-900/90 to-zinc-950 p-6">
          <div className="flex flex-col md:flex-row items-center gap-6">
            <HealthRing score={healthScore} />

            <div className="flex-1 w-full space-y-4">
              <div>
                <div className="flex items-baseline justify-between">
                  <p className="text-xs uppercase tracking-wider text-zinc-400">
                    Income vs Obligations
                  </p>
                  <p className="text-xs text-zinc-400">
                    {Math.round(incomeProgress)}%
                  </p>
                </div>
                <div className="mt-2 h-3 w-full rounded-full bg-zinc-800 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-700 ${
                      incomeProgress >= 100
                        ? "bg-gradient-to-r from-emerald-400 to-cyan-400"
                        : incomeProgress >= 60
                        ? "bg-gradient-to-r from-yellow-400 to-emerald-400"
                        : "bg-gradient-to-r from-orange-400 to-red-400"
                    }`}
                    style={{ width: `${incomeProgress}%` }}
                  />
                </div>
                <div className="flex justify-between mt-1 text-[11px] text-zinc-500">
                  <span>{formatMoney(incomeSoFar)} in</span>
                  <span>{formatMoney(totalNeeded)} needed</span>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Income
                  </p>
                  <p className="text-lg font-semibold text-emerald-400">
                    {formatMoney(incomeSoFar)}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Spent
                  </p>
                  <p className="text-lg font-semibold text-red-400">
                    {formatMoney(spendSoFar)}
                  </p>
                </div>
                <div className="rounded-xl bg-zinc-900/60 border border-zinc-800 p-3">
                  <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                    Status
                  </p>
                  <p
                    className={`text-lg font-semibold ${
                      forecast.projectedOnTrack
                        ? "text-emerald-400"
                        : "text-orange-400"
                    }`}
                  >
                    {forecast.projectedOnTrack ? "On Track" : "Behind"}
                  </p>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Chart */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-semibold text-white">{chartLabel}</p>
              <p className="text-[11px] text-zinc-500">
                Projected based on your daily income & spend pace
              </p>
            </div>
            {lowestPoint && (
              <div className="text-right">
                <p className="text-[10px] uppercase tracking-wider text-zinc-500">
                  Lowest cash
                </p>
                <p
                  className={`text-sm font-semibold ${
                    lowestPoint.cash < 0 ? "text-red-400" : "text-emerald-400"
                  }`}
                >
                  {formatMoney(lowestPoint.cash)} on {lowestPoint.day}
                </p>
              </div>
            )}
          </div>

          <div className="h-64 -mx-2">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData}>
                <defs>
                  <linearGradient id="cashFill" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#34d399" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="#34d399" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid stroke="#27272a" strokeDasharray="3 3" />
                <XAxis
                  dataKey="day"
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  stroke="#3f3f46"
                  interval="preserveStartEnd"
                />
                <YAxis
                  tick={{ fill: "#71717a", fontSize: 10 }}
                  stroke="#3f3f46"
                  tickFormatter={(v) => `$${v}`}
                />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "#18181b",
                    border: "1px solid #27272a",
                    borderRadius: 8,
                    color: "#fafafa",
                    fontSize: 12,
                  }}
                  formatter={(v: number) => formatMoney(v)}
                />
                <ReferenceLine y={0} stroke="#ef4444" strokeDasharray="4 4" />
                <Area
                  type="monotone"
                  dataKey="cash"
                  stroke="#34d399"
                  strokeWidth={2}
                  fill="url(#cashFill)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* Alerts */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <p className="text-sm font-semibold text-white">Ben's Alerts</p>
          <div className="space-y-2">
            {forecast.incomeGap > 0 && (
              <Alert
                tone="danger"
                title={`Short by ${formatMoney(forecast.incomeGap)}`}
                body="You'll come up short this month if your pace doesn't change."
              />
            )}
            {forecast.dailyIncomeNeeded > 50 && (
              <Alert
                tone="warning"
                title={`Need ${formatMoney(forecast.dailyIncomeNeeded)}/day`}
                body="Your daily income target is high — consider extra hours or a side gig."
              />
            )}
            {lowestPoint && lowestPoint.cash < 0 && (
              <Alert
                tone="danger"
                title={`Cash dips below $0 on ${lowestPoint.day}`}
                body={`Projected low: ${formatMoney(lowestPoint.cash)}. Move money around or push a bill.`}
              />
            )}
            {forecast.projectedOnTrack && (
              <Alert
                tone="success"
                title="You're pacing well"
                body="Keep the momentum and you'll close the month in good shape."
              />
            )}
            <Alert
              tone="info"
              title="Monitoring bill clusters"
              body="Ben is watching for back‑to‑back due dates that strain cash flow."
            />
          </div>
        </section>

        {/* Scenario Testing (placeholder) */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-white">Scenario Testing</p>
            <span className="text-[10px] uppercase tracking-wide text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded-full">
              Coming soon
            </span>
          </div>
          <p className="text-xs text-zinc-400">
            Ask Ben things like "What if I pay $200 extra on my card?" or "Can I
            afford a $150 subscription?" and see the impact instantly.
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

/* ─────────────────────────────
   ALERT
──────────────────────────── */
function Alert({
  tone,
  title,
  body,
}: {
  tone: "success" | "warning" | "danger" | "info";
  title: string;
  body: string;
}) {
  const styles = {
    success: "border-emerald-500/30 bg-emerald-500/5 text-emerald-300",
    warning: "border-yellow-500/30 bg-yellow-500/5 text-yellow-300",
    danger: "border-red-500/30 bg-red-500/5 text-red-300",
    info: "border-zinc-700 bg-zinc-900/60 text-zinc-300",
  } as const;

  const dot = {
    success: "bg-emerald-400",
    warning: "bg-yellow-400",
    danger: "bg-red-400",
    info: "bg-zinc-500",
  } as const;

  return (
    <div className={`rounded-xl border p-3 ${styles[tone]}`}>
      <div className="flex items-start gap-3">
        <span className={`mt-1.5 h-2 w-2 rounded-full ${dot[tone]} shrink-0`} />
        <div>
          <p className="text-sm font-semibold">{title}</p>
          <p className="text-xs opacity-80 mt-0.5">{body}</p>
        </div>
      </div>
    </div>
  );
}
