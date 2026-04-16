"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { BenEngine } from "@/lib/ben/engine";
import BenBubble from "@/components/BenBubble";

/* ---------------- TYPES ---------------- */

type SpendRow = {
  id: string;
  amount: number;
  category: string | null;
  user_id?: string;
};

type IncomeRow = {
  id: string;
  amount: number;
  user_id?: string;
};

type DebtRow = {
  id: string;
  balance: number;
  minimum_payment?: number;
  user_id?: string;
};

type BucketRow = {
  id: string;
  name: string;
  due_date: string | null;
  kind: string;
  category: string | null;
  user_id?: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  user_id?: string;
};

/* ---------------- HELPERS ---------------- */

function formatUSD(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
}

/* ---------------- PAGE ---------------- */

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [buckets, setBuckets] = useState<BucketRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data: sessionData, error: sessionError } =
        await supabase.auth.getSession();

      if (sessionError || !sessionData.session?.user) {
        setLoading(false);
        return;
      }

      const uid = sessionData.session.user.id;

      const [spendRes, incomeRes, debtRes, bucketRes, paymentRes] =
        await Promise.all([
          supabase.from("spend_entries").select("*").eq("user_id", uid),
          supabase.from("income_entries").select("*").eq("user_id", uid),
          supabase.from("debts").select("*").eq("user_id", uid),
          supabase.from("buckets").select("*").eq("user_id", uid),
          supabase.from("payments").select("*").eq("user_id", uid),
        ]);

      setSpend((spendRes.data || []) as SpendRow[]);
      setIncome((incomeRes.data || []) as IncomeRow[]);
      setDebts((debtRes.data || []) as DebtRow[]);
      setBuckets((bucketRes.data || []) as BucketRow[]);
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

  // TOTAL DEBT BALANCE (for display only)
  const totalDebtBalance = useMemo(
    () => debts.reduce((a, b) => a + Number(b.balance || 0), 0),
    [debts]
  );

  // TOTAL MONTHLY MINIMUM PAYMENTS (for Ben + obligations)
  const totalDebtMinimums = useMemo(
    () =>
      debts.reduce(
        (a, b) => a + Number(b.minimum_payment || 0),
        0
      ),
    [debts]
  );

  const net = totalIncome - totalSpend - totalDebtBalance;

  const topCategory = useMemo(() => {
    const map: Record<string, number> = {};

    for (const s of spend) {
      const cat = s.category || "misc";
      map[cat] = (map[cat] || 0) + Number(s.amount || 0);
    }

    return Object.entries(map).sort((a, b) => b[1] - a[1])[0]?.[0] || "—";
  }, [spend]);

  /* ---------------- BEN MESSAGE (HYBRID) ---------------- */

  const totalObligations = totalSpend + totalDebtMinimums;
  const incomeGap = Math.max(0, totalObligations - totalIncome);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Dashboard",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: 0,
  });

  /* ---------------- UI ---------------- */

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-50 p-6">
        <div className="text-sm text-zinc-600">Loading dashboard...</div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <div className="max-w-6xl mx-auto">
        <header className="mb-6">
          <h1 className="text-3xl font-black text-zinc-950">Dashboard</h1>
          <p className="mt-2 text-sm text-zinc-600">
            A quick snapshot of your income, spending, debt, and overall
            financial posture.
          </p>

          {/* Ben narrator bubble */}
          <div className="mt-4">
            <BenBubble message={ben.text} mood={ben.mood} />
          </div>
        </header>

        <section className="mt-6 grid gap-4 md:grid-cols-4">
          <Card label="Income" value={totalIncome} />
          <Card label="Spend" value={totalSpend} />
          <Card label="Debt" value={totalDebtBalance} />
          <Card label="Net" value={net} />
        </section>

        <section className="mt-8 rounded-xl bg-white p-6 border border-zinc-200">
          <h2 className="font-bold text-zinc-900">Top Spending Category</h2>
          <p className="text-2xl font-black mt-2 text-zinc-950">
            {topCategory}
          </p>
          <p className="mt-2 text-sm text-zinc-600">
            This is where the largest share of your tracked spending is going
            right now.
          </p>
        </section>

        <section className="mt-8 rounded-xl bg-white p-6 border border-zinc-200 text-sm text-zinc-600 space-y-1">
          <div>Spend entries: {spend.length}</div>
          <div>Income entries: {income.length}</div>
          <div>Debts: {debts.length}</div>
          <div>Buckets: {buckets.length}</div>
          <div>Payments: {payments.length}</div>
        </section>
      </div>
    </main>
  );
}

/* ---------------- CARD ---------------- */

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-zinc-200 bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-black text-zinc-950">
        {formatUSD(value)}
      </div>
    </div>
  );
}
