"use client";

import { useEffect, useMemo, useState } from "react";
import BenBubble from "@/components/BenBubble";
import { createClient } from "@/utils/supabase/client";
import type {
  SpendEntry,
  IncomeEntry,
  BillEntry,
  DebtEntry,
} from "@/lib/money/types";

type BenMood = "encouraging" | "stern" | "witty" | "urgent" | "celebratory";
type DateRangeKey = "7d" | "30d" | "90d" | "all";

const todayISO = new Date().toISOString().slice(0, 10);

function filterByDateRange<T extends { date_iso?: string }>(
  items: T[],
  range: DateRangeKey
): T[] {
  if (range === "all") return items;
  const days = range === "7d" ? 7 : range === "30d" ? 30 : 90;
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  return items.filter((item) => {
    if (!item.date_iso) return true;
    return new Date(item.date_iso) >= cutoff;
  });
}

export default function DashboardPage() {
  const supabase = createClient();

  const [loading, setLoading] = useState(true);

  const [spendEntries, setSpendEntries] = useState<SpendEntry[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntry[]>([]);
  const [billEntries, setBillEntries] = useState<BillEntry[]>([]);
  const [debtEntries, setDebtEntries] = useState<DebtEntry[]>([]);

  const [dateRange, setDateRange] = useState<DateRangeKey>("30d");

  // -----------------------------
  // Load real Supabase data
  // -----------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);

      const user = (await supabase.auth.getUser()).data.user;
      if (!user) return;

      const [spend, income, bills, debts] = await Promise.all([
        supabase.from("spend_entries").select("*").eq("user_id", user.id),
        supabase.from("income_entries").select("*").eq("user_id", user.id),
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
      ]);

      setSpendEntries(spend.data ?? []);
      setIncomeEntries(income.data ?? []);
      setBillEntries(bills.data ?? []);
      setDebtEntries(debts.data ?? []);

      setLoading(false);
    }

    load();
  }, []);

  // -----------------------------
  // Date filtering
  // -----------------------------
  const effectiveSpend = useMemo(
    () => filterByDateRange(spendEntries, dateRange),
    [spendEntries, dateRange]
  );
  const effectiveIncome = useMemo(
    () => filterByDateRange(incomeEntries, dateRange),
    [incomeEntries, dateRange]
  );

  // -----------------------------
  // Totals
  // -----------------------------
  const totalSpend = useMemo(
    () => effectiveSpend.reduce((sum, s) => sum + s.amount, 0),
    [effectiveSpend]
  );
  const totalIncome = useMemo(
    () => effectiveIncome.reduce((sum, i) => sum + i.amount, 0),
    [effectiveIncome]
  );
  const totalBills = useMemo(
    () => billEntries.reduce((sum, b) => sum + b.amount, 0),
    [billEntries]
  );
  const totalDebtPayments = useMemo(
    () => debtEntries.reduce((sum, d) => sum + d.min_payment, 0),
    [debtEntries]
  );

  const netCashFlow = totalIncome - totalBills - totalDebtPayments - totalSpend;

  // -----------------------------
  // Ben narrator
  // -----------------------------
  const benMood: BenMood =
    netCashFlow > 0
      ? "celebratory"
      : netCashFlow > -200
      ? "encouraging"
      : "urgent";

  const benText =
    netCashFlow > 0
      ? `You’re running a surplus of $${netCashFlow.toFixed(
          2
        )}. Strong momentum.`
      : netCashFlow > -200
      ? `You're close to break-even. A few adjustments could flip this positive.`
      : `This window is running negative by $${Math.abs(
          netCashFlow
        ).toFixed(
          2
        )}. Let’s tighten spend or adjust bills to avoid stress later.`;

  const rangeLabel =
    dateRange === "7d"
      ? "Last 7 days"
      : dateRange === "30d"
      ? "Last 30 days"
      : dateRange === "90d"
      ? "Last 90 days"
      : "All time";

  // -----------------------------
  // UI
  // -----------------------------
  return (
    <main className="min-h-screen bg-slate-950 text-slate-50">
      <header className="p-6 border-b border-white/10">
        <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-bold">Premium Dashboard</h1>
            <p className="text-sm text-slate-400">
              High-level view of your cash, obligations, and momentum.
            </p>
          </div>

          {/* Date range controls */}
          <div className="flex flex-col items-end gap-2">
            <div className="inline-flex rounded-full bg-white/5 p-1 text-xs">
              {(["7d", "30d", "90d", "all"] as DateRangeKey[]).map((key) => (
                <button
                  key={key}
                  onClick={() => setDateRange(key)}
                  className={`px-3 py-1 rounded-full ${
                    dateRange === key
                      ? "bg-white text-slate-900"
                      : "text-slate-300"
                  }`}
                >
                  {key.toUpperCase()}
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-500">{rangeLabel}</p>
          </div>
        </div>

        {/* Ben narrator */}
        <div className="mt-4">
          <BenBubble text={benText} mood={benMood} />
        </div>

        {/* Summary row */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
          <SummaryCard label="Total Income" value={totalIncome} tone="positive" />
          <SummaryCard label="Total Spend" value={totalSpend} tone="negative" />
          <SummaryCard label="Monthly Bills" value={totalBills} tone="neutral" />
          <SummaryCard
            label="Debt Minimums"
            value={totalDebtPayments}
            tone="neutral"
          />
        </div>
      </header>

      <section className="p-6 grid gap-6 md:grid-cols-3">
        {/* Cashflow snapshot */}
        <div className="md:col-span-2 rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-2">
            Cashflow snapshot
          </h2>
          <p className="text-xs text-slate-400 mb-4">
            Income minus bills, debt minimums, and spend in the selected window.
          </p>

          <div className="flex items-end gap-6">
            <div>
              <p className="text-xs text-slate-400">Net cashflow</p>
              <p
                className={`text-3xl font-bold ${
                  netCashFlow >= 0 ? "text-emerald-300" : "text-red-300"
                }`}
              >
                ${netCashFlow.toFixed(2)}
              </p>
            </div>

            <div className="flex-1">
              <div className="h-2 w-full rounded-full bg-slate-800 overflow-hidden">
                <div
                  className={`h-full ${
                    netCashFlow >= 0 ? "bg-emerald-400" : "bg-red-500"
                  }`}
                  style={{
                    width: `${Math.min(
                      100,
                      Math.max(5, Math.abs(netCashFlow) / 10)
                    )}%`,
                  }}
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-2">
                This bar is a rough visual of how intense this window feels.
              </p>
            </div>
          </div>
        </div>

        {/* Upcoming obligations */}
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          <h2 className="text-sm font-semibold text-slate-200 mb-2">
            Upcoming obligations
          </h2>
          <p className="text-xs text-slate-400 mb-3">
            Bills and debt minimums you’ll need to cover soon.
          </p>

          <div className="space-y-2 max-h-64 overflow-y-auto text-xs">
            {billEntries.map((bill) => (
              <div
                key={bill.id}
                className="flex items-center justify-between rounded-lg bg-slate-900/40 px-2 py-1.5"
              >
                <div>
                  <p className="font-medium text-slate-100">{bill.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Due day {bill.due_day}
                  </p>
                </div>
                <p className="font-semibold text-slate-100">
                  ${bill.amount.toFixed(2)}
                </p>
              </div>
            ))}

            {debtEntries.map((debt) => (
              <div
                key={debt.id}
                className="flex items-center justify-between rounded-lg bg-slate-900/40 px-2 py-1.5"
              >
                <div>
                  <p className="font-medium text-slate-100">{debt.name}</p>
                  <p className="text-[11px] text-slate-500">
                    Min ${debt.min_payment.toFixed(2)}
                    {debt.due_day ? ` • Due day ${debt.due_day}` : ""}
                  </p>
                </div>
                <p className="font-semibold text-slate-100">
                  ${debt.balance.toFixed(2)}
                </p>
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}

type SummaryTone = "positive" | "negative" | "neutral";

function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: SummaryTone;
}) {
  const color =
    tone === "positive"
      ? "text-emerald-300"
      : tone === "negative"
      ? "text-red-300"
      : "text-slate-100";

  return (
    <div className="rounded-xl bg-slate-900/60 p-4 border border-white/10">
      <p className="text-xs text-slate-400">{label}</p>
      <p className={`mt-1 text-xl font-semibold ${color}`}>
        ${value.toFixed(2)}
      </p>
    </div>
  );
}
