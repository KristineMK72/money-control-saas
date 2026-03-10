"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BillRow = {
  id: string;
  name: string;
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;
  target: number;
  due_date: string | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
};

type IncomeRow = {
  id: string;
  amount: number;
  date_iso: string;
};

type SpendRow = {
  id: string;
  amount: number;
  date_iso: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  date_iso: string;
};

type DebtRow = {
  id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  due_date: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
};

type PlanItem = {
  id: string;
  name: string;
  dueDate: string | null;
  amount: number;
  type: "bill" | "debt";
  category?: string | null;
};

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWindow(daysFromNow: number) {
  const d = startOfToday();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateSafe(dateISO?: string | null) {
  if (!dateISO) return null;
  const d = new Date(`${dateISO}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatDueLabel(dateISO?: string | null) {
  if (!dateISO) return "no due date";
  const due = parseDateSafe(dateISO);
  if (!due) return dateISO;

  const today = startOfToday();
  const diff = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

  if (diff < 0) return `overdue (${dateISO})`;
  if (diff === 0) return "today";
  if (diff === 1) return "tomorrow";
  if (diff <= 7) return `${dateISO}`;
  return dateISO;
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

function effectiveDebtPaymentAmount(debt: DebtRow) {
  return Number(debt.monthly_min_payment || debt.min_payment || 0);
}

function scorePlanItem(item: PlanItem) {
  let score = 0;
  const due = parseDateSafe(item.dueDate);
  const today = startOfToday();

  if (due) {
    const days = Math.ceil((due.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    if (days < 0) score += 50;
    else if (days === 0) score += 40;
    else if (days === 1) score += 35;
    else if (days <= 3) score += 28;
    else if (days <= 7) score += 20;
    else score += 8;
  }

  if (item.category === "housing") score += 35;
  if (item.category === "utilities") score += 28;
  if (item.category === "transportation") score += 24;
  if (item.type === "debt") score += 14;

  return score;
}

function StatCard({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

  useEffect(() => {
    async function loadForecast() {
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
        setMessage("Please log in to view your forecast.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

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

    loadForecast();
  }, []);

  const weekEnd = endOfWindow(6);

  const totalIncome = useMemo(
    () => incomeEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [incomeEntries]
  );

  const totalSpending = useMemo(
    () => spendEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [spendEntries]
  );

  const totalPayments = useMemo(
    () => paymentEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [paymentEntries]
  );

  const weekBills = useMemo(() => {
    return bills
      .map((bill) => ({
        id: bill.id,
        name: bill.name,
        dueDate: effectiveBillDueDate(bill),
        amount: effectiveBillAmount(bill),
        type: "bill" as const,
        category: bill.category,
      }))
      .filter((bill) => {
        const due = parseDateSafe(bill.dueDate);
        return due && due <= weekEnd;
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [bills, weekEnd]);

  const weekDebtMinimums = useMemo(() => {
    return debts
      .map((debt) => ({
        id: debt.id,
        name: debt.name,
        dueDate: effectiveDebtDueDate(debt),
        amount: effectiveDebtPaymentAmount(debt),
        type: "debt" as const,
        category: debt.kind,
      }))
      .filter((debt) => {
        const due = parseDateSafe(debt.dueDate);
        return due && due <= weekEnd && debt.amount > 0;
      })
      .sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || ""));
  }, [debts, weekEnd]);

  const billsThisWeekTotal = useMemo(
    () => weekBills.reduce((sum, item) => sum + item.amount, 0),
    [weekBills]
  );

  const debtThisWeekTotal = useMemo(
    () => weekDebtMinimums.reduce((sum, item) => sum + item.amount, 0),
    [weekDebtMinimums]
  );

  const remainingAfterWeek = totalIncome - billsThisWeekTotal - debtThisWeekTotal;
  const safeSpendingRemaining = remainingAfterWeek - totalSpending - totalPayments;

  const allPriorityItems = useMemo(() => {
    return [...weekBills, ...weekDebtMinimums]
      .map((item) => ({
        ...item,
        score: scorePlanItem(item),
      }))
      .sort((a, b) => b.score - a.score);
  }, [weekBills, weekDebtMinimums]);

  const top3 = allPriorityItems.slice(0, 3);

  const dailyNeed = useMemo(() => {
    const totalNeeded = billsThisWeekTotal + debtThisWeekTotal;
    const today = startOfToday();
    const daysLeft = Math.max(
      1,
      Math.ceil((weekEnd.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) + 1
    );
    return totalNeeded / daysLeft;
  }, [billsThisWeekTotal, debtThisWeekTotal, weekEnd]);

  const recommendedPriorityLines = useMemo(() => {
    if (top3.length === 0) {
      return [
        "Add bills and debt accounts to generate your weekly plan.",
      ];
    }

    return top3.map((item, index) => {
      if (item.category === "housing") {
        return `${index + 1}. Pay ${item.name} immediately`;
      }
      if (item.category === "utilities") {
        return `${index + 1}. Fund ${item.name} before shutoff risk rises`;
      }
      if (item.category === "transportation") {
        return `${index + 1}. Set aside ${item.name} to protect transportation`;
      }
      if (item.type === "debt") {
        return `${index + 1}. Cover the minimum for ${item.name}`;
      }
      return `${index + 1}. Set aside ${item.name}`;
    });
  }, [top3]);

  const sharePlan = async () => {
    const text = [
      "My Financial Plan (This Week)",
      "",
      `Income: ${formatUSD(totalIncome)}`,
      "",
      "Bills Due:",
      ...(weekBills.length
        ? weekBills.map((item) => `• ${item.name} — ${formatUSD(item.amount)} (${formatDueLabel(item.dueDate)})`)
        : ["• None"]),
      "",
      "Debt Minimums:",
      ...(weekDebtMinimums.length
        ? weekDebtMinimums.map((item) => `• ${item.name} — ${formatUSD(item.amount)} (${formatDueLabel(item.dueDate)})`)
        : ["• None"]),
      "",
      `Safe Spending Remaining: ${formatUSD(safeSpendingRemaining)}`,
      `Daily Need To Cover This Week: ${formatUSD(dailyNeed)}`,
      "",
      "Recommended Priorities:",
      ...recommendedPriorityLines,
    ].join("\n");

    if (navigator.share) {
      await navigator.share({
        title: "My Financial Plan",
        text,
      });
      return;
    }

    await navigator.clipboard.writeText(text);
    setMessage("Plan copied to clipboard.");
  };

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Weekly plan
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Forecast
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                See what is due this week, what to pay first, and how much you need each day to stay covered.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Dashboard
              </a>
              <a
                href="/crisis"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Crisis Mode
              </a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {!userId && !loading ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="font-semibold text-white">You are not logged in.</div>
              <p className="mt-2 text-sm text-zinc-300">
                Go to signup/login first, then come back here.
              </p>
              <div className="mt-4">
                <a
                  href="/signup"
                  className="inline-flex rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Go to Signup / Login
                </a>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Income" value={formatUSD(totalIncome)} />
            <StatCard label="Bills this week" value={formatUSD(billsThisWeekTotal)} />
            <StatCard label="Debt minimums this week" value={formatUSD(debtThisWeekTotal)} />
            <StatCard label="Spending" value={formatUSD(totalSpending)} />
            <StatCard label="Daily need" value={formatUSD(dailyNeed)} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.2fr_0.8fr]">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-2xl font-black">My Financial Plan (This Week)</h2>
                  <p className="mt-1 text-sm text-zinc-500">
                    A simple action plan based on what is due in the next 7 days.
                  </p>
                </div>

                <button
                  onClick={sharePlan}
                  className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                >
                  Share Plan
                </button>
              </div>

              <div className="mt-6 grid gap-4 md:grid-cols-2">
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-sm text-zinc-500">Income</div>
                  <div className="mt-1 text-2xl font-black">{formatUSD(totalIncome)}</div>
                </div>

                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-sm text-zinc-500">Safe Spending Remaining</div>
                  <div className="mt-1 text-2xl font-black">{formatUSD(safeSpendingRemaining)}</div>
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold">Bills Due</h3>
                <div className="mt-3 grid gap-3">
                  {weekBills.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No bills due this week.
                    </div>
                  ) : (
                    weekBills.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-zinc-500">
                            {formatDueLabel(item.dueDate)}
                          </div>
                        </div>
                        <div className="font-bold">{formatUSD(item.amount)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold">Debt Minimums</h3>
                <div className="mt-3 grid gap-3">
                  {weekDebtMinimums.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No debt minimums due this week.
                    </div>
                  ) : (
                    weekDebtMinimums.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-zinc-500">
                            {formatDueLabel(item.dueDate)}
                          </div>
                        </div>
                        <div className="font-bold">{formatUSD(item.amount)}</div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Recommended Priorities</h2>
                <div className="mt-4 grid gap-3">
                  {recommendedPriorityLines.map((line, idx) => (
                    <div key={idx} className="rounded-2xl bg-zinc-50 p-4 font-medium">
                      {line}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Daily Need</h2>
                <p className="mt-2 text-sm text-zinc-500">
                  The average amount you need per day to cover this week’s bills and debt minimums.
                </p>
                <div className="mt-4 text-4xl font-black">{formatUSD(dailyNeed)}</div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">This Week Snapshot</h2>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Income</span>
                    <span className="font-bold">{formatUSD(totalIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Bills</span>
                    <span className="font-bold">{formatUSD(billsThisWeekTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Debt minimums</span>
                    <span className="font-bold">{formatUSD(debtThisWeekTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Spending</span>
                    <span className="font-bold">{formatUSD(totalSpending)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                    <span className="text-emerald-700">Safe spending remaining</span>
                    <span className="font-bold text-emerald-700">{formatUSD(safeSpendingRemaining)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-zinc-400">Loading forecast...</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
