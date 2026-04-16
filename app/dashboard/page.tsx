"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ---------------- TYPES (match your schema) ---------------- */

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
  balance: number;
  min_payment?: number | null;
  monthly_min_payment?: number | null;
};

type BillRow = {
  id: string;
  name: string;
  target: number;
  due_date: string | null;
  kind: string;
  category: string | null;
};

type PaymentRow = {
  id: string;
  amount: number;
};

/* ---------------- PAGE ---------------- */

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: sessionData } = await supabase.auth.getSession();
      const user = sessionData?.session?.user;
      if (!user) {
        setLoading(false);
        return;
      }

      const uid = user.id;

      const [spendRes, incomeRes, debtRes, billRes, paymentRes] =
        await Promise.all([
          supabase
            .from("spend_entries")
            .select("id, amount, category")
            .eq("user_id", uid),

          supabase
            .from("income_entries")
            .select("id, amount")
            .eq("user_id", uid),

          supabase
            .from("debts")
            .select("id, balance, min_payment, monthly_min_payment")
            .eq("user_id", uid),

          supabase
            .from("bills")
            .select("id, name, target, due_date, kind, category")
            .eq("user_id", uid),

          supabase
            .from("payments")
            .select("id, amount")
            .eq("user_id", uid),
        ]);

      setSpend((spendRes.data || []) as SpendRow[]);
      setIncome((incomeRes.data || []) as IncomeRow[]);
      setDebts((debtRes.data || []) as DebtRow[]);
      setBills((billRes.data || []) as BillRow[]);
      setPayments((paymentRes.data || []) as PaymentRow[]);

      setLoading(false);
    }

    load();
  }, [supabase]);

  /* ---------------- TOTALS ---------------- */

  const totalSpend = useMemo(
    () => spend.reduce((a, b) => a + Number(b.amount || 0), 0),
    [spend]
  );

  const totalIncome = useMemo(
    () => income.reduce((a, b) => a + Number(b.amount || 0), 0),
    [income]
  );

  const totalDebt = useMemo(
    () => debts.reduce((a, b) => a + Number(b.balance || 0), 0),
    [debts]
  );

  const net = totalIncome - totalSpend - totalDebt;

  /* ---------------- MONTHLY OBLIGATIONS ---------------- */

  // Bills: sum of bill.target
  const totalBillTargets = useMemo(
    () => bills.reduce((sum, b) => sum + Number(b.target || 0), 0),
    [bills]
  );

  // Debts: sum of min_payment or monthly_min_payment
  const totalDebtMinimums = useMemo(
    () =>
      debts.reduce(
        (sum, d) =>
          sum +
          Number(
            d.monthly_min_payment ??
              d.min_payment ??
              0
          ),
        0
      ),
    [debts]
  );

  const combinedMonthly = totalBillTargets + totalDebtMinimums;

  /* ---------------- TOP CATEGORY ---------------- */

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};

    for (const s of spend) {
      const cat = s.category || "misc";
      map[cat] = (map[cat] || 0) + Number(s.amount || 0);
    }

    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [spend]);

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-3xl font-black">Dashboard</h1>

      {/* MAIN CARDS */}
      <div className="mt-6 grid gap-4 md:grid-cols-5">
        <Card label="Income" value={totalIncome} />
        <Card label="Spend" value={totalSpend} />
        <Card label="Debt" value={totalDebt} />
        <Card label="Net" value={net} />

        {/* NEW Monthly Obligations Card */}
        <div className="rounded-xl border bg-white p-4">
          <div className="text-sm text-zinc-500 font-semibold">
            Monthly Obligations
          </div>

          <div className="mt-3 space-y-1 text-sm text-zinc-600">
            <div className="flex justify-between">
              <span>Bills Total</span>
              <span>${totalBillTargets.toFixed(2)}</span>
            </div>

            <div className="flex justify-between">
              <span>Debt Minimums</span>
              <span>${totalDebtMinimums.toFixed(2)}</span>
            </div>

            <div className="border-t pt-2 mt-2 flex justify-between font-bold">
              <span>Total Monthly</span>
              <span>${combinedMonthly.toFixed(2)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* TOP CATEGORY */}
      <div className="mt-8 rounded-xl bg-white p-6 border">
        <h2 className="font-bold">Top Category</h2>
        <p className="text-2xl font-black mt-2">{topCategory}</p>
      </div>

      {/* COUNTS */}
      <div className="mt-8 rounded-xl bg-white p-6 border text-sm text-zinc-600 space-y-1">
        <div>Spend entries: {spend.length}</div>
        <div>Income entries: {income.length}</div>
        <div>Debts: {debts.length}</div>
        <div>Bills: {bills.length}</div>
        <div>Payments: {payments.length}</div>
      </div>
    </main>
  );
}

/* ---------------- CARD COMPONENT ---------------- */

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-black">
        ${Number(value).toFixed(2)}
      </div>
    </div>
  );
}
