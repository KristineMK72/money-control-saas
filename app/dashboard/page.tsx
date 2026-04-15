"use client";

import { useMoneyStore } from "@/lib/money/store";

export default function DashboardPage() {
  const spend = useMoneyStore((s) => s.spend);
  const income = useMoneyStore((s) => s.income);
  const debts = useMoneyStore((s) => s.debts);
  const buckets = useMoneyStore((s) => s.buckets);
  const payments = useMoneyStore((s) => s.payments);

  const totalSpend = spend.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalIncome = income.reduce((a, b) => a + Number(b.amount || 0), 0);
  const totalDebt = debts.reduce((a, b) => a + Number(b.amount || 0), 0);

  const net = totalIncome - totalSpend - totalDebt;

  const categoryTotals: Record<string, number> = {};

  for (const s of spend) {
    const cat = s.category || "misc";
    categoryTotals[cat] =
      (categoryTotals[cat] || 0) + Number(s.amount || 0);
  }

  const topCategory =
    Object.entries(categoryTotals).sort((a, b) => b[1] - a[1])[0]?.[0] ||
    "—";

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-3xl font-black">Dashboard</h1>

      <div className="mt-6 grid gap-4 md:grid-cols-4">
        <Card label="Income" value={totalIncome} />
        <Card label="Spend" value={totalSpend} />
        <Card label="Debt" value={totalDebt} />
        <Card label="Net" value={net} />
      </div>

      <div className="mt-8 rounded-xl bg-white p-6 border">
        <h2 className="font-bold">Top Category</h2>
        <p className="text-2xl font-black mt-2">{topCategory}</p>
      </div>

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
