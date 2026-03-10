"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { getPriorityBuckets } from "@/lib/money/priority";
import type { Bucket } from "@/lib/money/types";
import AppTabs from "@/components/AppTabs";
import { getNextDueDateFromDay } from "@/lib/money/recurring";

type BillRow = {
  id: string;
  name: string;
  kind: "bill" | "credit" | "loan";
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;
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
};

type IncomeRow = { id: string; amount: number };
type SpendRow = { id: string; amount: number };
type PaymentRow = { id: string; amount: number };
type DebtRow = {
  id: string;
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
};

function effectiveBillDueDate(row: BillRow) {
  if (row.due_date) return row.due_date;
  if (row.is_monthly && row.due_day) return getNextDueDateFromDay(row.due_day);
  return undefined;
}

function effectiveBillAmount(row: BillRow) {
  return Number(row.monthly_target || row.target || 0);
}

function mapBillToBucket(row: BillRow): Bucket {
  return {
    key: row.id,
    name: row.name,
    kind: row.kind,
    target: effectiveBillAmount(row),
    saved: Number(row.saved || 0),
    dueDate: effectiveBillDueDate(row),
    due: row.due || undefined,
    priority: (row.priority as 1 | 2 | 3 | 4 | 5 | null) || undefined,
    focus: !!row.focus,
    balance: row.balance == null ? undefined : Number(row.balance),
    apr: row.apr == null ? undefined : Number(row.apr),
    minPayment: row.min_payment == null ? undefined : Number(row.min_payment),
    creditLimit: row.credit_limit == null ? undefined : Number(row.credit_limit),
    isMonthly: !!row.is_monthly,
    monthlyTarget: row.monthly_target == null ? undefined : Number(row.monthly_target),
    dueDay: row.due_day == null ? undefined : Number(row.due_day),
    category: row.category || undefined,
  };
}

export default function DashboardPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [buckets, setBuckets] = useState<Bucket[]>([]);
  const [incomeTotal, setIncomeTotal] = useState(0);
  const [spendingTotal, setSpendingTotal] = useState(0);
  const [paymentsTotal, setPaymentsTotal] = useState(0);
  const [debtBalanceTotal, setDebtBalanceTotal] = useState(0);
  const [debtMinimumsTotal, setDebtMinimumsTotal] = useState(0);

  useEffect(() => {
    async function loadDashboard() {
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
        supabase.from("debts").select("id, balance, min_payment, monthly_min_payment"),
      ]);

      if (billsRes.error) {
        setMessage(billsRes.error.message);
      } else {
        setBuckets(((billsRes.data || []) as BillRow[]).map(mapBillToBucket));
      }

      if (!incomeRes.error) {
        setIncomeTotal(((incomeRes.data || []) as IncomeRow[]).reduce((s, r) => s + Number(r.amount || 0), 0));
      }

      if (!spendRes.error) {
        setSpendingTotal(((spendRes.data || []) as SpendRow[]).reduce((s, r) => s + Number(r.amount || 0), 0));
      }

      if (!paymentsRes.error) {
        setPaymentsTotal(((paymentsRes.data || []) as PaymentRow[]).reduce((s, r) => s + Number(r.amount || 0), 0));
      }

      if (!debtsRes.error) {
        const debtRows = (debtsRes.data || []) as DebtRow[];
        setDebtBalanceTotal(debtRows.reduce((s, r) => s + Number(r.balance || 0), 0));
        setDebtMinimumsTotal(
          debtRows.reduce((s, r) => s + Number(r.monthly_min_payment || r.min_payment || 0), 0)
        );
      }

      setLoading(false);
    }

    loadDashboard();
  }, []);

  const priorities = useMemo(() => getPriorityBuckets(buckets).slice(0, 3), [buckets]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
          <p className="mt-2 text-zinc-600">Calm overview of what matters most right now.</p>
        </div>

        <AppTabs />

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        {!userId && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">You are not logged in.</div>
            <a href="/signup" className="mt-4 inline-flex rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black">
              Go to Signup / Login
            </a>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income</div>
            <div className="mt-2 text-3xl font-black">${incomeTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Spending</div>
            <div className="mt-2 text-3xl font-black">${spendingTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Payments</div>
            <div className="mt-2 text-3xl font-black">${paymentsTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt Balance</div>
            <div className="mt-2 text-3xl font-black">${debtBalanceTotal.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt Minimums</div>
            <div className="mt-2 text-3xl font-black">${debtMinimumsTotal.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pay these first</h2>
            <a href="/bills" className="text-sm font-semibold text-zinc-700 hover:text-black">
              Manage bills
            </a>
          </div>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">Loading dashboard...</div>
            ) : priorities.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No bills yet. Add bills to generate a priority plan.
              </div>
            ) : (
              priorities.map(({ bucket, score }) => (
                <div key={bucket.key} className="flex items-center justify-between rounded-xl bg-zinc-50 p-4">
                  <div>
                    <div className="font-semibold">{bucket.name}</div>
                    <div className="text-sm text-zinc-500">
                      ${bucket.target.toFixed(2)} · Due {bucket.dueDate || "not set"} · {bucket.category || "other"}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-zinc-700">Score {score}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
