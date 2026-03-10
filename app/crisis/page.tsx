"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "bill" | "credit" | "loan";
  category:
    | "housing"
    | "utilities"
    | "transportation"
    | "debt"
    | "food"
    | "other"
    | null;
  target: number;
  saved: number;
  due_date: string | null;
  due: string | null;
  priority: number | null;
  focus: boolean | null;
  balance: number | null;
  apr: number | null;
  min_payment: number | null;
  credit_limit: number | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
  created_at: string;
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
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  credit_limit: number | null;
  note: string | null;
  created_at: string;
};

type CrisisItem = {
  id: string;
  name: string;
  amount: number;
  dueDate?: string | null;
  category: string;
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

function daysUntil(dateISO?: string | null) {
  const due = parseDateSafe(dateISO);
  if (!due) return null;
  const today = startOfToday();
  const diff = due.getTime() - today.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function scoreBill(bill: BillRow) {
  let score = 0;
  const d = daysUntil(bill.due_date);

  if (d != null) {
    if (d < 0) score += 50;
    else if (d <= 3) score += 40;
    else if (d <= 7) score += 28;
    else if (d <= 14) score += 16;
    else score += 6;
  } else {
    score += 4;
  }

  if (bill.category === "housing") score += 35;
  if (bill.category === "utilities") score += 28;
  if (bill.category === "transportation") score += 25;
  if (bill.category === "food") score += 15;
  if (bill.category === "debt") score += 10;

  if (bill.focus) score += 8;
  if (bill.kind === "loan") score += 8;
  if (bill.kind === "credit") score += 4;

  return score;
}

function scoreDebt(debt: DebtRow) {
  let score = 0;
  const d = daysUntil(debt.due_date);

  if (d != null) {
    if (d < 0) score += 38;
    else if (d <= 3) score += 30;
    else if (d <= 7) score += 22;
    else if (d <= 14) score += 12;
    else score += 5;
  } else {
    score += 3;
  }

  if (debt.kind === "loan") score += 18;
  if (debt.kind === "credit") score += 8;
  if ((debt.min_payment || 0) > 0) score += 8;
  if ((debt.apr || 0) >= 25) score += 6;

  return score;
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
        setMessage("Please log in to view Crisis Mode.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const [billsRes, incomeRes, spendRes, paymentsRes, debtsRes] =
        await Promise.all([
          supabase
            .from("bills")
            .select("*")
            .order("due_date", { ascending: true, nullsFirst: false }),
          supabase.from("income_entries").select("id, amount, date_iso"),
          supabase.from("spend_entries").select("id, amount, date_iso"),
          supabase.from("payments").select("id, amount, date_iso"),
          supabase
            .from("debts")
            .select("*")
            .order("due_date", { ascending: true, nullsFirst: false }),
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
    const debtMinimums = debts.reduce((sum, row) => sum + Number(row.min_payment || 0), 0);

    return {
      income,
      spending,
      payments,
      debtMinimums,
    };
  }, [incomeEntries, spendEntries, paymentEntries, debts]);

  const rankedItems = useMemo(() => {
    const billItems: CrisisItem[] = bills.map((bill) => ({
      id: `bill-${bill.id}`,
      name: bill.name,
      amount: Number(bill.target || 0),
      dueDate: bill.due_date,
      category: bill.category || "other",
      source: "bill",
      score: scoreBill(bill),
    }));

    const debtItems: CrisisItem[] = debts
      .filter((debt) => Number(debt.min_payment || 0) > 0)
      .map((debt) => ({
        id: `debt-${debt.id}`,
        name: debt.name,
        amount: Number(debt.min_payment || 0),
        dueDate: debt.due_date,
        category: debt.kind,
        source: "debt",
        score: scoreDebt(debt),
      }));

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

  const stabilizationRoom = totals.income - criticalNext7Total - totals.spending - totals.payments;

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
        "Set due dates for the bills that matter most.",
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
        return `Cover the minimum on ${item.name} if possible.`;
      }
      return `Put money toward ${item.name} next.`;
    });
  }, [top3]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Crisis Mode</h1>
            <p className="mt-2 text-zinc-600">
              Calm triage for what matters most right now, powered by your real data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Dashboard
            </a>

            <a
              href="/forecast"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Forecast
            </a>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        {!userId && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">You are not logged in.</div>
            <p className="mt-2 text-sm text-zinc-600">
              Go to signup/login first, then come back here.
            </p>
            <div className="mt-4">
              <a
                href="/signup"
                className="inline-flex rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Go to Signup / Login
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Today’s focus
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight">
            {headline}
          </div>
          <div className="mt-4 text-sm text-zinc-600">
            Income logged: {formatUSD(totals.income)} · Spending: {formatUSD(totals.spending)} · Payments: {formatUSD(totals.payments)} · Debt minimums: {formatUSD(totals.debtMinimums)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Critical next 7 days</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(criticalNext7Total)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Room after critical items</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(stabilizationRoom)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Tracked obligations</div>
            <div className="mt-2 text-3xl font-black">{rankedItems.length}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Top 3 actions now</h2>
            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  Loading crisis plan...
                </div>
              ) : (
                actions.map((action, i) => (
                  <div key={i} className="rounded-2xl bg-zinc-50 p-4">
                    <div className="text-xs font-semibold text-zinc-500">
                      Action {i + 1}
                    </div>
                    <div className="mt-1 font-semibold">{action}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Priority funding</h2>
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
                        {formatUSD(item.amount)} · Due {item.dueDate || "not set"} · {item.category}
                      </div>
                    </div>
                    <div className="text-sm font-bold text-zinc-700">
                      Score {item.score}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">72-hour stabilization plan</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">Today</div>
              <div className="mt-1 font-semibold">
                Fund the highest-risk essential item first.
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">
                Next 24 hours
              </div>
              <div className="mt-1 font-semibold">
                Protect utilities, transportation, or minimum obligations.
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

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Everything ranked</h2>
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
              rankedItems.map((item, idx) => (
                <div
                  key={item.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">
                      {idx + 1}. {item.name}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {item.source} · {item.category} · Due {item.dueDate || "not set"}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="font-semibold">{formatUSD(item.amount)}</div>
                    <div className="text-xs text-zinc-500">Score {item.score}</div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
