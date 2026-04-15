"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type SpendRow = {
  id: string;
  amount: number;
  category: string | null;
};

type IncomeRow = {
  id: string;
  amount: number;
};

type DebtRow = {
  id: string;
  amount?: number;
  balance?: number;
};

type BucketRow = {
  id: string;
  name: string;
};

type PaymentRow = {
  id: string;
  amount: number;
};

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [buckets, setBuckets] = useState<BucketRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [loading, setLoading] = useState(true);

  // -----------------------
  // LOAD ALL DATA
  // -----------------------
  useEffect(() => {
    async function load() {
      setLoading(true);

      const [
        spendRes,
        incomeRes,
        debtsRes,
        bucketsRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from("spend").select("*"),
        supabase.from("income").select("*"),
        supabase.from("debts").select("*"),
        supabase.from("buckets").select("*"),
        supabase.from("payments").select("*"),
      ]);

      setSpend((spendRes.data || []) as SpendRow[]);
      setIncome((incomeRes.data || []) as IncomeRow[]);
      setDebts((debtsRes.data || []) as DebtRow[]);
      setBuckets((bucketsRes.data || []) as BucketRow[]);
      setPayments((paymentsRes.data || []) as PaymentRow[]);

      setLoading(false);
    }

    load();
  }, []);

  // -----------------------
  // CALCULATIONS
  // -----------------------
  const totalSpend = useMemo(
    () => spend.reduce((a, b) => a + Number(b.amount || 0), 0),
    [spend]
  );

  const totalIncome = useMemo(
    () => income.reduce((a, b) => a + Number(b.amount || 0), 0),
    [income]
  );

  const totalDebt = useMemo(
    () =>
      debts.reduce(
        (a, b) => a + Number(b.amount ?? b.balance ?? 0),
        0
      ),
    [debts]
  );

  const net = totalIncome - totalSpend - totalDebt;

  const categoryTotals: Record<string, number> = useMemo(() => {
    const map: Record<string, number> = {};

    for (const s of spend) {
      const cat = s.category || "misc";
      map[cat] = (map[cat] || 0) + Number(s.amount || 0);
    }

    return map;
  }, [spend]);

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "—";

  // -----------------------
  // UI
  // -----------------------
  if (loading) {
    return <div className="p-6">Loading dashboard...</div>;
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-3xl font-black">Dashboard</h1>

      {/* CARDS */}
      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card label="Income" value={totalIncome} />
        <Card label="Spend" value={totalSpend} />
        <Card label="Debt" value={totalDebt} />
        <Card label="Net" value={net} />
      </div>

      {/* TOP CATEGORY */}
      <div className="mt-8 rounded-xl bg-white p-6 border">
        <h2 className="font-bold">Top Category</h2>
        <p className="text-2xl font-black mt-2">{topCategory}</p>
      </div>

      {/* OVERVIEW */}
      <div className="mt-8 rounded-xl bg-white p-6 border">
        <h2 className="font-bold">Overview</h2>

        <div className="text-sm mt-3 space-y-1 text-zinc-600">
          <div>Spend entries: {spend.length}</div>
          <div>Income sources: {income.length}</div>
          <div>Debts: {debts.length}</div>
          <div>Buckets: {buckets.length}</div>
          <div>Payments: {payments.length}</div>
        </div>
      </div>
    </main>
  );
}

// -----------------------
// CARD COMPONENT
// -----------------------
function Card({
  label,
  value,
}: {
  label: string;
  value: number;
}) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-black">
        ${Number(value).toFixed(2)}
      </div>
    </div>
  );
}
