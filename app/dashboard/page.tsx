"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoneyStore, getTotals } from "@/lib/money/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import EnableNotificationsButton from "@/components/EnableNotificationsButton";
import type { DebtEntry } from "@/lib/money/types";

// ─────────────────────────────────────────────
// Supabase-only types (snake_case stays HERE ONLY)
// ─────────────────────────────────────────────

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

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWindow(days: number) {
  const d = startOfToday();
  d.setDate(d.getDate() + days);
  d.setHours(23, 59, 59, 999);
  return d;
}

function parseDateSafe(date?: string | null) {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date?: string | null) {
  const d = parseDateSafe(date);
  if (!d) return null;
  return Math.ceil((d.getTime() - startOfToday().getTime()) / 86400000);
}

// ─────────────────────────────────────────────
// Bill logic (STAYS snake_case because Supabase)
// ─────────────────────────────────────────────

function effectiveBillDueDate(bill: BillRow) {
  if (bill.is_monthly && bill.due_day) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const last = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(bill.due_day, last);

    return new Date(year, month, safeDay).toISOString().slice(0, 10);
  }

  return bill.due_date;
}

function effectiveBillAmount(bill: BillRow) {
  return Number(
    bill.min_payment ??
    bill.monthly_target ??
    bill.balance ??
    bill.target ??
    0
  );
}

// ─────────────────────────────────────────────
// Debt logic (CLEAN camelCase ONLY)
// ─────────────────────────────────────────────

function effectiveDebtDueDate(debt: DebtEntry) {
  if (debt.isMonthly && debt.dueDay) {
    const now = new Date();
    const year = now.getFullYear();
    const month = now.getMonth();

    const last = new Date(year, month + 1, 0).getDate();
    const safeDay = Math.min(debt.dueDay, last);

    return new Date(year, month, safeDay).toISOString().slice(0, 10);
  }

  return debt.dueDate ?? null;
}

function effectiveDebtAmount(debt: DebtEntry) {
  return Number(
    debt.monthlyMinPayment ??
    debt.minPayment ??
    debt.balance ??
    0
  );
}

function effectiveDebtBalance(debt: DebtEntry) {
  return Number(debt.remainingBalance ?? debt.balance ?? 0);
}

// ─────────────────────────────────────────────
// UI Components (unchanged)
// ─────────────────────────────────────────────

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function formatUSD(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

// ─────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const { debts: storeDebts } = useMoneyStore();
  const totals = getTotals();

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [sideHustles, setSideHustles] = useState<SideHustleRow[]>([]);

  useEffect(() => {
    let mounted = true;

    async function load() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user || !mounted) return;

      const [billsRes, hustlesRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("side_hustles").select("*").eq("user_id", user.id),
      ]);

      if (!mounted) return;

      setBills((billsRes.data ?? []) as BillRow[]);
      setSideHustles((hustlesRes.data ?? []) as SideHustleRow[]);
      setLoading(false);
    }

    load();
    return () => { mounted = false; };
  }, [supabase]);

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
      return { ...item, score: 1 };
    });

    const debtItems = storeDebts.map((debt) => {
      const item = {
        id: `debt-${debt.id}`,
        name: debt.name,
        amount: effectiveDebtAmount(debt),
        dueDate: effectiveDebtDueDate(debt),
        category: "debt",
        source: "debt" as const,
      };
      return { ...item, score: 1 };
    });

    return [...billItems, ...debtItems].slice(0, 3);
  }, [bills, storeDebts]);

  if (loading) {
    return <main className="text-white p-10">Loading...</main>;
  }

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Income" value={formatUSD(totals.income)} />
          <StatCard label="Spending" value={formatUSD(totals.spending)} />
          <StatCard label="Payments" value={formatUSD(totals.payments)} />
          <StatCard
            label="Remaining"
            value={formatUSD(totals.income - totals.spending - totals.payments)}
          />
        </div>
      </div>
    </main>
  );
}
