"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  category:
    | "housing"
    | "utilities"
    | "transportation"
    | "debt"
    | "food"
    | "other"
    | null;
  target: number;
  due_date: string | null;
  focus: boolean | null;
  kind: "bill" | "credit" | "loan";
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
};

type IncomeRow = { id: string; amount: number; date_iso?: string };
type SpendRow = { id: string; amount: number; date_iso?: string };
type PaymentRow = { id: string; amount: number; date_iso?: string };

type DebtRow = {
  id: string;
  user_id: string;
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  name: string;
  kind: "credit" | "loan";
  credit_limit: number | null;
};

type SideHustleRow = {
  id: string;
  user_id: string;
  name: string;
  income_type: "hourly" | "item" | "project" | "fixed";
  rate: number;
  planned_quantity: number;
  note: string | null;
  created_at: string;
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
  const nextMonthDue = new Date(
    nextMonthYear,
    nextMonth,
    safeDayNextMonth,
    12,
    0,
    0,
    0
  );

  return nextMonthDue.toISOString().slice(0, 10);
}

function effectiveBillDueDate(bill: BillRow) {
  if (bill.is_monthly && bill.due_day) return getNextDueDateFromDay(bill.due_day);
  if (bill.due_date) return bill.due_date;
  return null;
}

function effectiveBillAmount(bill: BillRow) {
  return Number(bill.monthly_target || bill.target || 0);
}

function effectiveDebtDueDate(debt: DebtRow) {
  if (debt.is_monthly && debt.due_day) return getNextDueDateFromDay(debt.due_day);
  if (debt.due_date) return debt.due_date;
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
  return `$${Number(n || 0).toFixed(2)}`;
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

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = goal <= 0 ? 100 : Math.min(100, Math.max(0, (current / goal) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-500">Goal progress</span>
        <span className="font-semibold text-zinc-950">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);
  const [sideHustles, setSideHustles] = useState<SideHustleRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setMessage("Please log in to view your dashboard.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [
        profileRes,
        billsRes,
        incomeRes,
        spendRes,
        paymentsRes,
        debtsRes,
        hustlesRes,
      ] = await Promise.all([
        supabase
          .from("profiles")
          .select("display_name")
          .eq("user_id", user.id)
          .maybeSingle(),
        supabase
          .from("bills")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("income_entries")
          .select("id, amount, date_iso")
          .eq("user_id", user.id),
        supabase
          .from("spend_entries")
          .select("id, amount, date_iso")
          .eq("user_id", user.id),
        supabase
          .from("payments")
          .select("id, amount, date_iso")
          .eq("user_id", user.id),
        supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
        supabase
          .from("side_hustles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      if (profileRes.data?.display_name) setName(profileRes.data.display_name);
      if (billsRes.error) setMessage(billsRes.error.message);
      else setBills((billsRes.data || []) as BillRow[]);

      if (incomeRes.error) setMessage((prev) => prev || incomeRes.error!.message);
      else setIncomeEntries((incomeRes.data || []) as IncomeRow[]);

      if (spendRes.error) setMessage((prev) => prev || spendRes.error!.message);
      else setSpendEntries((spendRes.data || []) as SpendRow[]);

      if (paymentsRes.error) setMessage((prev) => prev || paymentsRes.error!.message);
      else setPaymentEntries((paymentsRes.data || []) as PaymentRow[]);

      if (debtsRes.error) setMessage((prev) => prev || debtsRes.error!.message);
      else setDebts((debtsRes.data || []) as DebtRow[]);

      if (hustlesRes.error) setMessage((prev) => prev || hustlesRes.error!.message);
      else setSideHustles((hustlesRes.data || []) as SideHustleRow[]);

      setLoading(false);
    }

    loadDashboard();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const incomeTotal = useMemo(
    () => incomeEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [incomeEntries]
  );

  const spendingTotal = useMemo(
    () => spendEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [spendEntries]
  );

  const paymentsTotal = useMemo(
    () => paymentEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [paymentEntries]
  );

  const remaining = incomeTotal - spendingTotal - paymentsTotal;

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

  const weekEnd = endOfWindow(6);

  const billsThisWeekTotal = useMemo(() => {
    return bills
      .map((bill) => ({
        dueDate: effectiveBillDueDate(bill),
        amount: effectiveBillAmount(bill),
      }))
      .filter((bill) => {
        const due = parseDateSafe(bill.dueDate);
        return due && due <= weekEnd;
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [bills, weekEnd]);

  const debtThisWeekTotal = useMemo(() => {
    return debts
      .map((debt) => ({
        dueDate: effectiveDebtDueDate(debt),
        amount: effectiveDebtAmount(debt),
      }))
      .filter((debt) => {
        const due = parseDateSafe(debt.dueDate);
        return due && due <= weekEnd;
      })
      .reduce((sum, debt) => sum + debt.amount, 0);
  }, [debts, weekEnd]);

  const gapThisWeek = Math.max(
    0,
    billsThisWeekTotal + debtThisWeekTotal + spendingTotal + paymentsTotal - incomeTotal
  );

  const plannedIncome = useMemo(() => {
    return sideHustles.reduce(
      (sum, row) => sum + Number(row.rate || 0) * Number(row.planned_quantity || 0),
      0
    );
  }, [sideHustles]);

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);

  const dueSoon = useMemo(() => {
    const end = endOfWindow(6);
    const rows: { name: string; amount: number; due: string; type: "bill" | "debt" }[] = [];

    for (const bill of bills) {
      const due = effectiveBillDueDate(bill);
      const dueDate = parseDateSafe(due);
      if (!due || !dueDate) continue;
      if (dueDate >= startOfToday() && dueDate <= end) {
        rows.push({
          name: bill.name,
          amount: effectiveBillAmount(bill),
          due,
          type: "bill",
        });
      }
    }

    for (const debt of debts) {
      const due = effectiveDebtDueDate(debt);
      const dueDate = parseDateSafe(due);
      if (!due || !dueDate) continue;
      if (dueDate >= startOfToday() && dueDate <= end) {
        rows.push({
          name: debt.name,
          amount: effectiveDebtAmount(debt),
          due,
          type: "debt",
        });
      }
    }

    return rows.sort((a, b) => a.due.localeCompare(b.due));
  }, [bills, debts]);

  const dueSoonTotal = useMemo(
    () => dueSoon.reduce((sum, item) => sum + item.amount, 0),
    [dueSoon]
  );

  const debtSnapshot = useMemo(() => {
    let balance = 0;
    let mins = 0;
    let creditBalance = 0;
    let creditLimit = 0;

    for (const debt of debts) {
      balance += Number(debt.balance || 0);
      mins += Number(debt.monthly_min_payment || debt.min_payment || 0);

      if (debt.kind === "credit") {
        creditBalance += Number(debt.balance || 0);
        creditLimit += Number(debt.credit_limit || 0);
      }
    }

    const utilization = creditLimit > 0 ? (creditBalance / creditLimit) * 100 : 0;

    return { balance, mins, utilization };
  }, [debts]);

  const stress = useMemo(() => {
    if (remaining < 0 || remainingGap > 300 || debtSnapshot.utilization > 75) {
      return {
        label: "Critical",
        tone: "#ef4444",
        message: "Ben says: We need a plan now, not later.",
      };
    }
    if (remainingGap > 0 || dueSoonTotal > 400 || debtSnapshot.utilization > 50) {
      return {
        label: "Stressed",
        tone: "#f97316",
        message: "Ben says: The next week looks financially spicy.",
      };
    }
    if (dueSoonTotal > 150 || debtSnapshot.utilization > 30) {
      return {
        label: "Tight",
        tone: "#eab308",
        message: "Ben says: Covered, but not roomy.",
      };
    }
    return {
      label: "Calm",
      tone: "#22c55e",
      message: "Ben says: Looking steadier here.",
    };
  }, [remaining, remainingGap, dueSoonTotal, debtSnapshot.utilization]);

  const insights = useMemo(() => {
    const items: string[] = [];

    if (debtSnapshot.utilization > 50) {
      items.push(`Credit utilization is ${debtSnapshot.utilization.toFixed(0)}%.`);
    } else if (debtSnapshot.utilization > 30) {
      items.push(
        `Credit utilization is ${debtSnapshot.utilization.toFixed(
          0
        )}%. Still worth watching.`
      );
    }

    if (dueSoon.length > 0) {
      items.push(
        `${dueSoon.length} item${dueSoon.length === 1 ? "" : "s"} due in the next 7 days.`
      );
    }

    if (remainingGap > 0) {
      items.push(`You still need ${formatUSD(remainingGap)} to fully cover this week.`);
    } else if (gapThisWeek > 0 && remainingGap === 0) {
      items.push("Your current side hustle plan covers this week's gap.");
    }

    if (debtSnapshot.mins > 0) {
      items.push(`Monthly debt minimums are ${formatUSD(debtSnapshot.mins)}.`);
    }

    if (items.length === 0) {
      items.push("No immediate financial fires detected.");
    }

    return items.slice(0, 4);
  }, [debtSnapshot, dueSoon, gapThisWeek, remainingGap]);
    if (loading) {
    return (
      <main className="min-h-screen bg-black px-6 py-10 text-white">
        Loading dashboard...
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 shadow-2xl md:p-8">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Money Command Center
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                {name ? `Welcome back, ${name}` : "Dashboard"}
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                One place to see risk, due dates, priorities, and momentum.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/bills" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Bills</a>
              <a href="/income" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Income</a>
              <a href="/spend" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Spending</a>
              <a href="/calendar" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Calendar</a>
              <a href="/payments" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Payments</a>
              <a href="/debt" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Credit & Loans</a>
              <a href="/credit-health" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Credit Health</a>
              <a href="/forecast" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Forecast</a>
              <a href="/crisis" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Crisis Mode</a>
              <a href="/income-plan" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Close the Gap</a>
              <a href="/credit-health" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Credit Health</a>
              <a href="/dispute-letter" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Dispute Letter</a> 
              <a href="/credit-recovery" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">Credit Recovery</a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {!userId ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="font-semibold text-white">You are not logged in.</div>
              <p className="mt-2 text-sm text-zinc-300">
                Go to signup/login first, then come back here.
              </p>
              <div className="mt-4">
                <a
                  href="/signup?mode=login"
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

          <div className="mt-8 grid gap-4 xl:grid-cols-4">
            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Financial Stress</div>
              <div className="mt-2 text-3xl font-black" style={{ color: stress.tone }}>
                {stress.label}
              </div>
              <div className="mt-3 text-sm text-zinc-600">{stress.message}</div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Due next 7 days</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                {formatUSD(dueSoonTotal)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Total debt</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                {formatUSD(debtSnapshot.balance)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Utilization</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                {debtSnapshot.utilization.toFixed(0)}%
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Today’s Priorities</h2>
                <p className="mt-1 text-sm text-zinc-500">
                  The most important bills and minimums to pay first.
                </p>

                <div className="mt-5 grid gap-3">
                  {priorities.length === 0 ? (
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

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Upcoming due dates</h2>
                <div className="mt-4 grid gap-3">
                  {dueSoon.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      Nothing due in the next 7 days.
                    </div>
                  ) : (
                    dueSoon.map((item, idx) => (
                      <div
                        key={`${item.name}-${item.due}-${idx}`}
                        className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                      >
                        <div>
                          <div className="font-semibold">{item.name}</div>
                          <div className="text-sm text-zinc-500">
                            {item.type} · due {item.due}
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
                <h2 className="text-xl font-black">Ben Insights</h2>
                <div className="mt-4 grid gap-3">
                  {insights.map((item, idx) => (
                    <div key={idx} className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-700">
                      {item}
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h2 className="text-xl font-black">Close the Gap</h2>
                    <p className="mt-1 text-sm text-zinc-500">
                      Track whether your side hustle plan covers this week’s shortfall.
                    </p>
                  </div>
                  <a
                    href="/income-plan"
                    className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
                  >
                    Open
                  </a>
                </div>

                <div className="mt-5">
                  <ProgressBar current={plannedIncome} goal={gapThisWeek} />
                </div>

                <div className="mt-5 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Gap this week</span>
                    <span className="font-bold">{formatUSD(gapThisWeek)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Planned income</span>
                    <span className="font-bold">{formatUSD(plannedIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                    <span className="text-emerald-700">Remaining gap</span>
                    <span className="font-bold text-emerald-700">
                      {formatUSD(remainingGap)}
                    </span>
                  </div>
                </div>

                <div className="mt-4 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  {gapThisWeek === 0
                    ? "You currently have no weekly gap based on your entries."
                    : remainingGap === 0
                    ? "Your current income plan covers the full gap."
                    : `You still need ${formatUSD(remainingGap)} to fully cover this week.`}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-xl font-black">Quick actions</h2>
                <div className="mt-4 flex flex-wrap gap-3">
                  <a href="/spend" className="rounded-xl bg-zinc-950 px-4 py-3 text-sm font-semibold text-white hover:bg-black">
                    Add Spend
                  </a>
                  <a href="/payments" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                    Add Payment
                  </a>
                  <a href="/bills" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                    Bills
                  </a>
                  <a href="/debt" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                    Debt
                  </a>
                  <a href="/calendar" className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold text-zinc-900 hover:bg-zinc-100">
                    Calendar
                  </a>
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
        </div>
      </div>
    </main>
  );
}
