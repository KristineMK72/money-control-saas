"use client";

import { useEffect, useMemo, useState } from "react";
import { useMoneyStore, getTotals } from "@/lib/money/store";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { DebtEntry } from "@/lib/money/types";

// ─────────────────────────────────────────────
// Supabase Row Types (ONLY here, raw snake_case)
// ─────────────────────────────────────────────

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;

  target: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;

  min_payment: number | null;
  monthly_target: number | null;
  balance?: number | null;
};

type SideHustleRow = {
  id: string;
  user_id: string;
  name: string;
  income_type: string;
  rate: number;
  planned_quantity: number;
  note: string | null;
};

// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function parseDate(date?: string | null) {
  if (!date) return null;
  const d = new Date(`${date}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function daysUntil(date?: string | null) {
  const d = parseDate(date);
  if (!d) return null;
  return Math.ceil((d.getTime() - startOfToday().getTime()) / 86400000);
}

// ─────────────────────────────────────────────
// BILL LOGIC (Supabase → UI normalization)
// ─────────────────────────────────────────────

function getBillDueDate(bill: BillRow) {
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

function getBillAmount(bill: BillRow) {
  return Number(
    bill.min_payment ??
    bill.monthly_target ??
    bill.balance ??
    bill.target ??
    0
  );
}

// ─────────────────────────────────────────────
// DEBT LOGIC (CLEAN unified model)
// ─────────────────────────────────────────────

function getDebtDueDate(debt: DebtEntry) {
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

function getDebtAmount(debt: DebtEntry) {
  return Number(debt.minPayment ?? debt.balance ?? 0);
}

// ─────────────────────────────────────────────
// UI
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
// PAGE
// ─────────────────────────────────────────────

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();
  const { debts } = useMoneyStore();
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
    return () => {
      mounted = false;
    };
  }, [supabase]);

  // ─────────────────────────────────────────────
  // DERIVED VALUES
  // ─────────────────────────────────────────────

  const income = useMemo(() => {
    return sideHustles.reduce(
      (sum, h) => sum + h.rate * h.planned_quantity,
      0
    );
  }, [sideHustles]);

  const billTotal = useMemo(() => {
    return bills.reduce((sum, b) => sum + getBillAmount(b), 0);
  }, [bills]);

  const debtTotal = useMemo(() => {
    return debts.reduce((sum, d) => sum + getDebtAmount(d), 0);
  }, [debts]);

  const remaining = income - billTotal - debtTotal - totals.spending - totals.payments;

  const dueSoon = useMemo(() => {
    const now = startOfToday();
    const end = new Date();
    end.setDate(end.getDate() + 7);

    const items: { name: string; amount: number; due: string | null }[] = [];

    for (const b of bills) {
      const due = getBillDueDate(b);
      const d = parseDate(due);
      if (d && d >= now && d <= end) {
        items.push({ name: b.name, amount: getBillAmount(b), due });
      }
    }

    for (const d of debts) {
      const due = getDebtDueDate(d);
      const date = parseDate(due);
      if (date && date >= now && date <= end) {
        items.push({ name: d.name, amount: getDebtAmount(d), due });
      }
    }

    return items;
  }, [bills, debts]);

  if (loading) {
    return (
      <main className="min-h-screen bg-black text-white p-10">
        Loading dashboard...
      </main>
    );
  }

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl p-6">
        <div className="grid gap-4 md:grid-cols-4">
          <StatCard label="Income" value={formatUSD(income)} />
          <StatCard label="Bills" value={formatUSD(billTotal)} />
          <StatCard label="Debt" value={formatUSD(debtTotal)} />
          <StatCard label="Remaining" value={formatUSD(remaining)} />
        </div>

        <div className="mt-10">
          <h2 className="text-xl font-bold mb-4">Due Soon</h2>
          <div className="space-y-2">
            {dueSoon.map((item, i) => (
              <div key={i} className="p-3 rounded-xl bg-white/10">
                <div className="flex justify-between">
                  <span>{item.name}</span>
                  <span>{formatUSD(item.amount)}</span>
                </div>
                <div className="text-sm text-zinc-400">{item.due}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </main>
  );
}
