"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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

type IncomeRow = { id: string; amount: number };
type SpendRow = { id: string; amount: number };
type PaymentRow = { id: string; amount: number };

type DebtRow = {
  id: string;
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  name: string;
};

type PriorityItem = {
  id: string;
  name: string;
  amount: number;
  dueDate: string | null;
  category: string | null;
  source: "bill" | "debt";
  score: number;
};

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

function scoreItem(item: Omit<PriorityItem, "score">) {
  let score = 0;
  const d = daysUntil(item.dueDate);

  if (d != null) {
    if (d < 0) score += 50;
    else if (d === 0) score += 40;
    else if (d === 1) score += 36;
    else if (d <= 3) score += 28;
    else if (d <= 7) score += 20;
    else score += 8;
  }

  if (item.category === "housing") score += 35;
  if (item.category === "utilities") score += 28;
  if (item.category === "transportation") score += 24;
  if (item.source === "debt") score += 12;

  return score;
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function formatDueLabel(dateISO?: string | null) {
  if (!dateISO) return "No due date";
  const d = daysUntil(dateISO);
  if (d == null) return dateISO;
  if (d < 0) return `Overdue · ${dateISO}`;
  if (d === 0) return "Due today";
  if (d === 1) return "Due tomorrow";
  return `Due ${dateISO}`;
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

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [spendingTotal, setSpendingTotal] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [debtBalanceTotal, setDebtBalanceTotal] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
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
        setMessage("Please log in to view your dashboard.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const [billsRes, incomeRes, spendRes, paymentsRes, debtsRes] = await Promise.all([
        supabase.from("bills").select("*").order("created_at", { ascending: false }),
        supabase.from("income_entries").select("id, amount"),
        supabase.from("spend_entries").select("id, amount"),
        supabase.from("payments").select("id, amount"),
        supabase.from("debts").select("*").order("created_at", { ascending: false }),
      ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      else setBills((billsRes.data || []) as BillRow[]);

      if (!incomeRes.error) {
        setIncomeTotal(
          ((incomeRes.data || []) as IncomeRow[]).reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0
          )
        );
      }

      if (!spendRes.error) {
        setSpendingTotal(
          ((spendRes.data || []) as SpendRow[]).reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0
          )
        );
      }

      if (!paymentsRes.error) {
        setPaymentsTotal(
          ((paymentsRes.data || []) as PaymentRow[]).reduce(
            (sum, row) => sum + Number(row.amount || 0),
            0
          )
        );
      }

      if (!debtsRes.error) {
        const rows = (debtsRes.data || []) as DebtRow[];
        setDebts(rows);
        setDebtBalanceTotal(
          rows.reduce((sum, row) => sum + Number(row.balance || 0), 0)
        );
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const priorities = useMemo(() => {
    const billItems = bills.map((bill) => {
      const item = {
        id: `bill-${bill.id}`,
        name: bill.name,
        amount: effectiveBillAmount(bill),
        dueDate: effectiveBillDueDate(bill),
        category: bill.category,
        source: "bill" as const,
      };
      return { ...item, score: scoreItem(item) };
    });

    const debtItems = debts
      .filter((debt) => effectiveDebtAmount(debt) > 0)
      .map((debt) => {
        const item = {
          id: `debt-${debt.id}`,
          name: debt.name,
          amount: effectiveDebtAmount(debt),
          dueDate: effectiveDebtDueDate(debt),
          category: "debt",
          source: "debt" as const,
        };
        return { ...item, score: scoreItem(item) };
      });

    return [...billItems, ...debtItems]
      .sort((a, b) => b.score - a.score)
      .slice(0, 3);
  }, [bills, debts]);

  const remaining = incomeTotal - spendingTotal - paymentsTotal;

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Financial overview
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Dashboard
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                See what matters most right now and what deserves attention first.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/bills"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Bills
              </a>
              <a
                href="/income"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Income
              </a>
              <a
                href="/spend"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Spending
              </a>
              <a
                href="/debt"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Credit & Loans
              </a>
              <a
                href="/forecast"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Forecast
              </a>
              <a
  href="/payments"
  className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
>
  Payments
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

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Income" value={formatUSD(incomeTotal)} />
            <StatCard label="Spending" value={formatUSD(spendingTotal)} />
            <StatCard label="Payments" value={formatUSD(paymentsTotal)} />
            <StatCard label="Remaining" value={formatUSD(remaining)} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
              <h2 className="text-2xl font-black">Today’s Priorities</h2>
              <p className="mt-1 text-sm text-zinc-500">
                The most important bills and minimums to pay first.
              </p>

              <div className="mt-5 grid gap-3">
                {loading ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                    Loading priorities...
                  </div>
                ) : priorities.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                    No urgent priorities yet.
                  </div>
                ) : (
                  priorities.map((item, idx) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                    >
                      <div>
                        <div className="font-semibold">
                          {idx + 1}. {item.name}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {formatDueLabel(item.dueDate)} · {item.category || item.source}
                        </div>
                      </div>
                      <div className="font-bold">{formatUSD(item.amount)}</div>
                    </div>
                  ))
                )}
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Snapshot</h2>
                <div className="mt-4 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Income</span>
                    <span className="font-bold">{formatUSD(incomeTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Spending</span>
                    <span className="font-bold">{formatUSD(spendingTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Debt balance</span>
                    <span className="font-bold">{formatUSD(debtBalanceTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                    <span className="text-emerald-700">Remaining</span>
                    <span className="font-bold text-emerald-700">
                      {formatUSD(remaining)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Best next move</h2>
                <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  {priorities.length > 0
                    ? `Start with ${priorities[0].name}. It’s the highest-risk item on your list right now.`
                    : "Add bills, debt, and income so the app can generate a stronger action plan."}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-zinc-400">Loading dashboard...</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
