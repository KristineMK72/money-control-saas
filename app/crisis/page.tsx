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

type IncomeRow = { id: string; amount: number; date_iso: string };
type SpendRow = { id: string; amount: number; date_iso: string };
type PaymentRow = { id: string; amount: number; date_iso: string };

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

type CrisisItem = {
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

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function scoreItem(item: Omit<CrisisItem, "score">) {
  let score = 0;
  const d = daysUntil(item.dueDate);

  if (d != null) {
    if (d < 0) score += 50;
    else if (d === 0) score += 42;
    else if (d === 1) score += 36;
    else if (d <= 3) score += 28;
    else if (d <= 7) score += 20;
    else score += 8;
  }

  if (item.category === "housing") score += 35;
  if (item.category === "utilities") score += 28;
  if (item.category === "transportation") score += 24;
  if (item.source === "debt") score += 14;

  return score;
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

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

export default function CrisisPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

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

    loadCrisis();
  }, []);

  const totals = useMemo(() => {
    const income = incomeEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const spending = spendEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const payments = paymentEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0);
    const debtMinimums = debts.reduce((sum, row) => sum + effectiveDebtAmount(row), 0);

    return { income, spending, payments, debtMinimums };
  }, [incomeEntries, spendEntries, paymentEntries, debts]);

  const rankedItems = useMemo(() => {
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

    return [...billItems, ...debtItems].sort((a, b) => b.score - a.score);
  }, [bills, debts]);

  const top3 = rankedItems.slice(0, 3);

  const criticalNext7Total = useMemo(() => {
    return rankedItems
      .filter((item) => {
        const d = daysUntil(item.dueDate);
        return d != null && d <= 7;
      })
      .reduce((sum, item) => sum + item.amount, 0);
  }, [rankedItems]);

  const stabilizationRoom =
    totals.income - criticalNext7Total - totals.spending - totals.payments;

  const headline = useMemo(() => {
    if (rankedItems.length === 0) {
      return "Add bills and debt accounts to generate a calm action plan.";
    }

    const topCategories = top3.map((item) => item.category);

    if (topCategories.includes("housing")) {
      return "Protect housing first, then utilities and transportation.";
    }
    if (topCategories.includes("utilities")) {
      return "Protect essential services first, then minimum debt obligations.";
    }
    if (topCategories.includes("transportation")) {
      return "Protect transportation first so income stays possible.";
    }

    return "Focus on the highest-risk obligations first and ignore lower-priority noise today.";
  }, [rankedItems, top3]);

  const actions = useMemo(() => {
    if (top3.length === 0) {
      return [
        "Add your most urgent bill first.",
        "Set due dates or due days for what matters most.",
        "Come back here to see your top priorities.",
      ];
    }

    return top3.map((item) => {
      if (item.category === "housing") {
        return `Pay ${item.name} first to protect housing stability.`;
      }
      if (item.category === "utilities") {
        return `Fund ${item.name} to reduce shutoff risk.`;
      }
      if (item.category === "transportation") {
        return `Protect ${item.name} so transportation stays available.`;
      }
      if (item.source === "debt") {
        return `Cover the monthly minimum on ${item.name} if possible.`;
      }
      return `Put money toward ${item.name} next.`;
    });
  }, [top3]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                72-hour triage
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Crisis Mode
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Calm triage for what matters most right now, powered by your real data.
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
                href="/forecast"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Forecast
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

          <div className="mt-8 rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
            <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
              Today’s focus
            </div>
            <div className="mt-3 text-2xl font-black tracking-tight">{headline}</div>
            <div className="mt-4 text-sm text-zinc-600">
              Income logged: {formatUSD(totals.income)} · Spending: {formatUSD(totals.spending)} · Payments: {formatUSD(totals.payments)} · Monthly debt minimums: {formatUSD(totals.debtMinimums)}
            </div>
          </div>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <StatCard label="Critical next 7 days" value={formatUSD(criticalNext7Total)} />
            <StatCard label="Room after critical items" value={formatUSD(stabilizationRoom)} />
            <StatCard label="Tracked obligations" value={String(rankedItems.length)} />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
              <h2 className="text-2xl font-black">Top 3 actions now</h2>
              <div className="mt-5 grid gap-3">
                {loading ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                    Loading crisis plan...
                  </div>
                ) : (
                  actions.map((action, i) => (
                    <div key={i} className="rounded-2xl bg-zinc-50 p-4">
                      <div className="text-xs font-semibold text-zinc-500">Action {i + 1}</div>
                      <div className="mt-1 font-semibold">{action}</div>
                    </div>
                  ))
                )}
              </div>

              <div className="mt-6">
                <h3 className="text-lg font-bold">72-hour stabilization plan</h3>
                <div className="mt-4 grid gap-3 md:grid-cols-3">
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-xs font-semibold text-zinc-500">Today</div>
                    <div className="mt-1 font-semibold">
                      Fund the highest-risk essential item first.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-xs font-semibold text-zinc-500">Next 24 hours</div>
                    <div className="mt-1 font-semibold">
                      Protect utilities, transportation, or monthly minimum obligations.
                    </div>
                  </div>
                  <div className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-xs font-semibold text-zinc-500">This week</div>
                    <div className="mt-1 font-semibold">
                      Pause non-essential spending and reduce leak categories.
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Priority funding</h2>
                <div className="mt-4 grid gap-3">
                  {loading ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      Loading priorities...
                    </div>
                  ) : top3.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No priority items yet.
                    </div>
                  ) : (
                    top3.map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-zinc-500">
                            {formatDueLabel(item.dueDate)} · {item.category || item.source}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="font-bold">{formatUSD(item.amount)}</div>
                          <div className="text-xs text-zinc-500">Score {item.score}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Everything ranked</h2>
                <div className="mt-4 grid gap-3">
                  {loading ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      Loading ranked items...
                    </div>
                  ) : rankedItems.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No bills or debt minimums to rank yet.
                    </div>
                  ) : (
                    rankedItems.slice(0, 8).map((item, idx) => (
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
                        <div className="text-right">
                          <div className="font-bold">{formatUSD(item.amount)}</div>
                          <div className="text-xs text-zinc-500">Score {item.score}</div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-zinc-400">Loading crisis mode...</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
