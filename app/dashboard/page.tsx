"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoneyStore, getTotals } from "@/lib/money/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import EnableNotificationsButton from "@/components/EnableNotificationsButton";
import type { DebtEntry } from "@/lib/money/types";   // ← Import from store

// Only keep types that come from Supabase (not in Zustand yet)
type BillRow = {
  id: string;
  user_id: string;
  name: string;
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;
  target: number | null;
  due_date: string | null;
  focus: boolean | null;
  kind: "bill" | "credit" | "loan";
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
  balance?: number | null;
  min_payment?: number | null;
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

// === HELPER FUNCTIONS ===
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
  const nextMonthDue = new Date(nextMonthYear, nextMonth, safeDayNextMonth, 12, 0, 0, 0);

  return nextMonthDue.toISOString().slice(0, 10);
}

function effectiveBillDueDate(bill: BillRow) {
  if (bill.is_monthly && bill.due_day) return getNextDueDateFromDay(bill.due_day);
  if (bill.due_date) return bill.due_date;
  return null;
}

function effectiveBillAmount(bill: BillRow) {
  return Number(bill.min_payment ?? bill.monthly_target ?? bill.balance ?? bill.target ?? 0);
}

// Updated to work with DebtEntry from Zustand store
function effectiveDebtDueDate(debt: DebtEntry) {
  if ((debt as any).is_monthly && (debt as any).due_day) return getNextDueDateFromDay((debt as any).due_day);
  if (debt.due_date) return debt.due_date;
  return null;
}

function effectiveDebtAmount(debt: DebtEntry) {
  return Number((debt as any).monthly_min_payment || (debt as any).min_payment || debt.balance || 0);
}

function effectiveDebtBalance(debt: DebtEntry) {
  return Number((debt as any).remaining_balance ?? debt.balance ?? 0);
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

function StatCard({ label, value }: { label: string; value: string }) {
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
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const { payments, debts: storeDebts } = useMoneyStore();
  const totals = getTotals();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [bills, setBills] = useState<BillRow[]>([]);
  const [sideHustles, setSideHustles] = useState<SideHustleRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function loadDashboard() {
      setLoading(true);
      setMessage("");

      const { data: { user }, error } = await supabase.auth.getUser();
      if (!mounted) return;

      if (error || !user) {
        setMessage(error?.message || "Please log in to view your dashboard.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const [profileRes, billsRes, hustlesRes] = await Promise.all([
        supabase.from("profiles").select("display_name").eq("user_id", user.id).maybeSingle(),
        supabase.from("bills").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
        supabase.from("side_hustles").select("*").eq("user_id", user.id).order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      if (profileRes.data?.display_name) setName(profileRes.data.display_name);
      if (billsRes.data) setBills(billsRes.data as BillRow[]);
      if (hustlesRes.data) setSideHustles(hustlesRes.data as SideHustleRow[]);

      setLoading(false);
    }

    loadDashboard();
    return () => { mounted = false; };
  }, [supabase]);

  const plannedIncome = useMemo(() => {
    return sideHustles.reduce((sum, row) => sum + Number(row.rate || 0) * Number(row.planned_quantity || 0), 0);
  }, [sideHustles]);

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

    const debtItems = storeDebts
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
  }, [bills, storeDebts]);

  const weekEnd = endOfWindow(6);

  const billsThisWeekTotal = useMemo(() => {
    return bills
      .map((bill) => ({ dueDate: effectiveBillDueDate(bill), amount: effectiveBillAmount(bill) }))
      .filter((bill) => {
        const due = parseDateSafe(bill.dueDate);
        return due && due <= weekEnd;
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [bills, weekEnd]);

  const debtThisWeekTotal = useMemo(() => {
    return storeDebts
      .map((debt) => ({ dueDate: effectiveDebtDueDate(debt), amount: effectiveDebtAmount(debt) }))
      .filter((debt) => {
        const due = parseDateSafe(debt.dueDate);
        return due && due <= weekEnd;
      })
      .reduce((sum, debt) => sum + debt.amount, 0);
  }, [storeDebts, weekEnd]);

  const gapThisWeek = Math.max(
    0,
    billsThisWeekTotal + debtThisWeekTotal + totals.spending + totals.payments - totals.income
  );

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);

  const dueSoon = useMemo(() => {
    const end = endOfWindow(6);
    const rows: { name: string; amount: number; due: string; type: "bill" | "debt" }[] = [];

    for (const bill of bills) {
      const due = effectiveBillDueDate(bill);
      const dueDate = parseDateSafe(due);
      if (due && dueDate && dueDate >= startOfToday() && dueDate <= end) {
        rows.push({ name: bill.name, amount: effectiveBillAmount(bill), due, type: "bill" });
      }
    }

    for (const debt of storeDebts) {
      const due = effectiveDebtDueDate(debt);
      const dueDate = parseDateSafe(due);
      if (due && dueDate && dueDate >= startOfToday() && dueDate <= end) {
        rows.push({ name: debt.name, amount: effectiveDebtAmount(debt), due, type: "debt" });
      }
    }

    return rows.sort((a, b) => a.due.localeCompare(b.due));
  }, [bills, storeDebts]);

  const dueSoonTotal = useMemo(() => dueSoon.reduce((sum, item) => sum + item.amount, 0), [dueSoon]);

  const debtSnapshot = useMemo(() => {
    let balance = 0;
    let mins = 0;
    for (const debt of storeDebts) {
      balance += effectiveDebtBalance(debt);
      mins += Number((debt as any).monthly_min_payment || (debt as any).min_payment || 0);
    }
    return { balance, mins, utilization: 0 };
  }, [storeDebts]);

  const stress = useMemo(() => {
    if (totals.income - totals.spending - totals.payments < 0 || remainingGap > 300) {
      return { label: "Critical", tone: "#ef4444", message: "Ben says: We need a plan now, not later." };
    }
    if (remainingGap > 0 || dueSoonTotal > 400) {
      return { label: "Stressed", tone: "#f97316", message: "Ben says: The next week looks financially spicy." };
    }
    if (dueSoonTotal > 150) {
      return { label: "Tight", tone: "#eab308", message: "Ben says: Covered, but not roomy." };
    }
    return { label: "Calm", tone: "#22c55e", message: "Ben says: Looking steadier here." };
  }, [totals, remainingGap, dueSoonTotal]);

  const insights = useMemo(() => {
    const items: string[] = [];
    if (dueSoon.length > 0) items.push(`${dueSoon.length} item${dueSoon.length === 1 ? "" : "s"} due in the next 7 days.`);
    if (remainingGap > 0) items.push(`You still need ${formatUSD(remainingGap)} to fully cover this week.`);
    if (debtSnapshot.mins > 0) items.push(`Monthly debt minimums are ${formatUSD(debtSnapshot.mins)}.`);
    if (items.length === 0) items.push("No immediate financial fires detected.");
    return items.slice(0, 4);
  }, [dueSoon, remainingGap, debtSnapshot]);

  if (loading) {
    return <main className="min-h-screen bg-black px-6 py-10 text-white">Loading dashboard...</main>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 shadow-2xl md:p-8">
          {/* Paste your full original JSX here */}
          {/* Update the stat cards and sections to use: */}
          {/* totals.income, totals.spending, totals.payments, debtSnapshot.balance, priorities, dueSoon, stress, insights, etc. */}

          {/* For example: */}
          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <StatCard label="Income" value={formatUSD(totals.income)} />
            <StatCard label="Spending" value={formatUSD(totals.spending)} />
            <StatCard label="Payments" value={formatUSD(totals.payments)} />
            <StatCard label="Remaining" value={formatUSD(totals.income - totals.spending - totals.payments)} />
          </div>

          {/* Add the rest of your UI (priorities, due soon, Ben insights, close the gap, etc.) using the new variables above */}
        </div>
      </div>
    </main>
  );
}
