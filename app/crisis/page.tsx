"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BillRow = {
  id: string;
  name: string;
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;
  target: number;
  due_date: string | null;
  focus: boolean | null;
  kind: "bill" | "credit" | "loan";
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
};

type DebtRow = {
  id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
};

type IncomeRow = { id: string; amount: number; date_iso: string };
type SpendRow = { id: string; amount: number; date_iso: string };
type PaymentRow = { id: string; amount: number; date_iso: string };

type CrisisItem = {
  id: string;
  name: string;
  amount: number;
  dueDate: string | null;
  category: string | null;
  source: "bill" | "debt";
  score: number;
  daysUntil: number | null;
};

/* ==================== HELPERS ==================== */

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDateSafe(dateISO?: string | null) {
  if (!dateISO) return null;
  const d = new Date(`${dateISO}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getNextDueDateFromDay(dueDay?: number | null) {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = startOfToday();

  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const safeDayThisMonth = Math.min(dueDay, lastDayThisMonth);
  const thisMonthDue = new Date(year, month, safeDayThisMonth, 12, 0, 0, 0);

  if (thisMonthDue >= today) return thisMonthDue.toISOString().slice(0, 10);

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const safeDayNextMonth = Math.min(dueDay, lastDayNextMonth);
  const nextMonthDue = new Date(nextMonthYear, nextMonth, safeDayNextMonth, 12, 0, 0, 0);

  return nextMonthDue.toISOString().slice(0, 10);
}

function effectiveBillDueDate(bill: BillRow) {
  if (bill.due_date) return bill.due_date;
  if (bill.is_monthly && bill.due_day) return getNextDueDateFromDay(bill.due_day);
  return null;
}

function effectiveBillAmount(bill: BillRow) {
  return Number(bill.monthly_target || bill.target || 0);
}

function effectiveDebtDueDate(debt: DebtRow) {
  if (debt.due_date) return debt.due_date;
  if (debt.is_monthly && debt.due_day) return getNextDueDateFromDay(debt.due_day);
  return null;
}

function effectiveDebtAmount(debt: DebtRow) {
  return Number(debt.monthly_min_payment || debt.min_payment || 0);
}

function daysUntil(dateISO?: string | null) {
  const due = parseDateSafe(dateISO);
  if (!due) return null;
  const today = startOfToday();
  return Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function formatUSD(n: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
  }).format(Math.round(n));
}

function getUrgencyColor(days: number | null) {
  if (days === null) return "text-zinc-400";
  if (days < 0) return "text-red-400";
  if (days === 0) return "text-orange-400";
  if (days <= 3) return "text-yellow-400";
  return "text-emerald-400";
}

function getScore(item: Omit<CrisisItem, "score" | "daysUntil"> & { daysUntil: number | null }) {
  let score = 0;
  const d = item.daysUntil;

  // Time pressure
  if (d !== null) {
    if (d < 0) score += 60;
    else if (d === 0) score += 50;
    else if (d <= 2) score += 40;
    else if (d <= 7) score += 25;
    else if (d <= 14) score += 12;
    else score += 5;
  }

  // Category priority
  if (item.category === "housing") score += 40;
  else if (item.category === "utilities") score += 32;
  else if (item.category === "transportation") score += 28;
  else if (item.category === "food") score += 15;

  if (item.source === "debt") score += 18;

  // High amount bonus in crisis
  if (item.amount > 800) score += 8;

  return Math.round(score);
}

/* ==================== MAIN COMPONENT ==================== */

export default function CrisisPage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);

  useEffect(() => {
    async function loadCrisis() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const session = data.session;
      if (!session?.user) {
        setMessage("Please log in to view Crisis Mode.");
        setLoading(false);
        return;
      }

      const [billsRes, incomeRes, spendRes, paymentsRes, debtsRes] = await Promise.all([
        supabase.from("bills").select("*").order("created_at", { ascending: false }),
        supabase.from("income_entries").select("id, amount, date_iso"),
        supabase.from("spend_entries").select("id, amount, date_iso"),
        supabase.from("payments").select("id, amount, date_iso"),
        supabase.from("debts").select("*").order("created_at", { ascending: false }),
      ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      else setBills((billsRes.data || []) as BillRow[]);

      if (!incomeRes.error) setIncomeEntries((incomeRes.data || []) as IncomeRow[]);
      if (!spendRes.error) setSpendEntries((spendRes.data || []) as SpendRow[]);
      if (!paymentsRes.error) setPaymentEntries((paymentsRes.data || []) as PaymentRow[]);
      if (!debtsRes.error) setDebts((debtsRes.data || []) as DebtRow[]);

      setLoading(false);
    }

    loadCrisis();
  }, [supabase]);

  const totals = useMemo(() => {
    const income = incomeEntries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const spending = spendEntries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const payments = paymentEntries.reduce((sum, r) => sum + Number(r.amount || 0), 0);
    const debtMins = debts.reduce((sum, d) => sum + effectiveDebtAmount(d), 0);

    return { income, spending, payments, debtMins };
  }, [incomeEntries, spendEntries, paymentEntries, debts]);

  const rankedItems = useMemo(() => {
    const billItems: CrisisItem[] = bills.map((bill) => {
      const dueDate = effectiveBillDueDate(bill);
      const item = {
        id: `bill-${bill.id}`,
        name: bill.name,
        amount: effectiveBillAmount(bill),
        dueDate,
        category: bill.category,
        source: "bill" as const,
        daysUntil: daysUntil(dueDate),
      };
      return { ...item, score: getScore(item) };
    });

    const debtItems: CrisisItem[] = debts
      .filter((d) => effectiveDebtAmount(d) > 0)
      .map((debt) => {
        const dueDate = effectiveDebtDueDate(debt);
        const item = {
          id: `debt-${debt.id}`,
          name: debt.name,
          amount: effectiveDebtAmount(debt),
          dueDate,
          category: "debt",
          source: "debt" as const,
          daysUntil: daysUntil(dueDate),
        };
        return { ...item, score: getScore(item) };
      });

    return [...billItems, ...debtItems].sort((a, b) => b.score - a.score);
  }, [bills, debts]);

  const top3 = rankedItems.slice(0, 3);

  const criticalNext7Total = useMemo(() => {
    return rankedItems
      .filter((item) => {
        const d = item.daysUntil;
        return d !== null && d <= 7 && d >= -30;
      })
      .reduce((sum, item) => sum + item.amount, 0);
  }, [rankedItems]);

  const totalMonthlyObligations = 
    totals.debtMins + bills.reduce((sum, b) => sum + effectiveBillAmount(b), 0);

  const dailyBurnRate = totals.spending > 0 ? Math.ceil(totals.spending / 30) : 0;
  const daysOfSafety = totals.income > 0 && dailyBurnRate > 0 
    ? Math.floor((totals.income - criticalNext7Total) / dailyBurnRate) 
    : 0;

  const stabilizationRoom = totals.income - criticalNext7Total - totals.spending - totals.payments;

  const headline = useMemo(() => {
    if (rankedItems.length === 0) {
      return "Add your bills and debts to generate a clear action plan.";
    }
    if (top3.some((i) => i.category === "housing")) return "Protect your housing first. Everything else comes after.";
    if (top3.some((i) => i.category === "utilities")) return "Keep essential services running before minimum debt payments.";
    if (top3.some((i) => i.category === "transportation")) return "Protect transportation so you can keep earning.";

    return "Focus on the highest-risk obligations first.";
  }, [rankedItems, top3]);

  const actions = useMemo(() => {
    if (top3.length === 0) return [];

    return top3.map((item, i) => ({
      priority: i + 1,
      title: item.name,
      amount: item.amount,
      due: item.daysUntil !== null 
        ? item.daysUntil < 0 
          ? `OVERDUE by ${Math.abs(item.daysUntil)} days`
          : item.daysUntil === 0 
            ? "DUE TODAY"
            : `Due in ${item.daysUntil} day${item.daysUntil > 1 ? "s" : ""}`
        : "No due date",
      suggestion: item.category === "housing" 
        ? "Pay immediately to maintain housing stability."
        : item.source === "debt" 
          ? "Cover at least the minimum to avoid late fees and penalties."
          : "Fund this as soon as possible to reduce immediate risk.",
    }));
  }, [top3]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white pb-12">
      <div className="mx-auto max-w-7xl px-6 py-10">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between mb-10">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-red-500/30 bg-red-500/10 px-5 py-1.5 text-xs font-semibold uppercase tracking-widest text-red-400">
              ⚠️ 72-HOUR TRIAGE
            </div>
            <h1 className="mt-4 text-5xl font-black tracking-tighter">Crisis Mode</h1>
            <p className="mt-3 max-w-xl text-xl text-zinc-400">
              Calm, prioritized action plan based on your real data.
            </p>
          </div>

          <div className="flex gap-3">
            <a href="/forecast" className="rounded-2xl border border-zinc-700 bg-zinc-900 px-6 py-3 text-sm font-medium hover:bg-zinc-800 transition">
              ← Forecast
            </a>
            <a href="/dashboard" className="rounded-2xl bg-emerald-600 px-6 py-3 text-sm font-semibold hover:bg-emerald-500 transition">
              Dashboard
            </a>
          </div>
        </div>

        {message && (
          <div className="mb-8 rounded-2xl border border-red-500/30 bg-red-950 p-4 text-red-200">
            {message}
          </div>
        )}

        {/* Key Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Critical Next 7 Days</div>
            <div className="mt-3 text-4xl font-bold text-red-400">{formatUSD(criticalNext7Total)}</div>
          </div>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Stabilization Room</div>
            <div className={`mt-3 text-4xl font-bold ${stabilizationRoom >= 0 ? "text-emerald-400" : "text-orange-400"}`}>
              {formatUSD(stabilizationRoom)}
            </div>
          </div>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Est. Days of Safety</div>
            <div className="mt-3 text-4xl font-bold text-white">{daysOfSafety}</div>
            <div className="text-xs text-zinc-500">at current burn rate</div>
          </div>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6">
            <div className="text-xs uppercase tracking-widest text-zinc-500">Total Monthly Obligations</div>
            <div className="mt-3 text-4xl font-bold text-white">{formatUSD(totalMonthlyObligations)}</div>
          </div>
        </div>

        {/* Headline */}
        <div className="mb-10 rounded-3xl border border-zinc-800 bg-gradient-to-br from-zinc-900 to-black p-8">
          <div className="text-emerald-400 text-sm font-semibold tracking-widest">TODAY’S FOCUS</div>
          <div className="mt-4 text-3xl font-bold leading-tight">{headline}</div>
        </div>

        {/* Top 3 Actions */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold mb-6 flex items-center gap-3">
            Immediate Actions
            <span className="text-sm font-normal text-zinc-500">(Ranked by risk)</span>
          </h2>

          <div className="grid gap-4">
            {loading ? (
              <div className="rounded-3xl bg-zinc-900 p-8 text-center text-zinc-400">Loading priorities...</div>
            ) : actions.length === 0 ? (
              <div className="rounded-3xl bg-zinc-900 p-8 text-center text-zinc-400">
                Add bills and debts to see prioritized actions.
              </div>
            ) : (
              actions.map((action) => (
                <div key={action.priority} className="group rounded-3xl border border-zinc-800 bg-zinc-900/70 p-6 hover:border-emerald-500/50 transition-all">
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-4">
                      <div className="flex h-9 w-9 items-center justify-center rounded-2xl bg-emerald-500/10 text-emerald-400 font-mono font-bold text-lg">
                        {action.priority}
                      </div>
                      <div>
                        <div className="font-semibold text-lg">{action.title}</div>
                        <div className={`text-sm ${getUrgencyColor(action.due.includes("OVERDUE") || action.due.includes("TODAY") ? 0 : 5)}`}>
                          {action.due}
                        </div>
                      </div>
                    </div>

                    <div className="text-right">
                      <div className="text-2xl font-bold">{formatUSD(action.amount)}</div>
                    </div>
                  </div>

                  <div className="mt-6 text-zinc-400 text-sm border-t border-zinc-800 pt-4">
                    {action.suggestion}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Full Ranked List */}
        <div className="rounded-3xl border border-zinc-800 bg-zinc-900 p-8">
          <h2 className="text-xl font-bold mb-6">All Obligations Ranked</h2>
          
          {loading ? (
            <p className="text-zinc-400 py-8">Loading ranked items...</p>
          ) : rankedItems.length === 0 ? (
            <p className="text-zinc-400 py-8">No bills or debt minimums added yet.</p>
          ) : (
            <div className="space-y-3">
              {rankedItems.slice(0, 12).map((item, idx) => (
                <div key={item.id} className="flex items-center justify-between rounded-2xl bg-zinc-950 p-5 border border-zinc-800 hover:border-zinc-700 transition">
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-zinc-500 w-6">{idx + 1}</span>
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-xs text-zinc-500">
                        {item.daysUntil !== null 
                          ? item.daysUntil < 0 
                            ? `Overdue by ${Math.abs(item.daysUntil)} days`
                            : `Due in ${item.daysUntil} day${item.daysUntil !== 1 ? 's' : ''}`
                          : "No due date"}
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-mono text-lg font-semibold">{formatUSD(item.amount)}</div>
                    <div className="text-[10px] text-zinc-500">Score: {item.score}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {loading && <div className="text-center text-zinc-400 mt-8">Loading your crisis priorities...</div>}
      </div>
    </main>
  );
}
