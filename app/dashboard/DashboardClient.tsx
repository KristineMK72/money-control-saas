"use client";

import { useState, useMemo } from "react";

/* ─────────────────────────────
   TYPES
──────────────────────────── */
type SpendEntry = {
  id: string;
  user_id: string;
  date_iso: string | null;
  merchant: string | null;
  amount: number;
  category: string | null;
  note: string | null;
  created_at: string | null;
};

type IncomeEntry = {
  id: string;
  user_id: string;
  amount: number;
  source: string | null;
  date_iso: string | null;
  received_on: string | null;
  created_at: string | null;
};

type Bill = {
  id: string;
  name: string;
  amount: number | null;
  target: number | null;
  monthly_target: number | null;
  min_payment: number | null;
  due_day: number | null;
};

type Debt = {
  id: string;
  name: string;
  min_payment: number | null;
  due_day: number | null;
};

type Payment = {
  id: string;
  amount: number;
  note: string | null;
  created_at: string | null;
  debt_id: string | null;
  bill_id: string | null;
};

type ActivityItem = SpendEntry | Payment;

type Props = {
  profile: {
    display_name: string | null;
  };
  initialBills?: Bill[];
  initialDebts?: Debt[];
  initialSpend?: SpendEntry[];
  initialIncome?: IncomeEntry[];
  initialPayments?: Payment[];
  user?: any;
};

/* ─────────────────────────────
   TYPE GUARD
──────────────────────────── */
function isPayment(item: ActivityItem): item is Payment {
  return "debt_id" in item || "bill_id" in item;
}

/* ─────────────────────────────
   SAFE HELPERS
──────────────────────────── */
function safeDate(value: string | null) {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
}

function formatDate(value: string | null) {
  const d = safeDate(value);
  return d ? d.toLocaleDateString() : "—";
}

function getMonthKey(value: string | null) {
  const d = safeDate(value);
  return d ? `${d.getFullYear()}-${d.getMonth() + 1}` : null;
}

function getMonthlyBillAmount(bill: Bill) {
  return (
    bill.target ||
    bill.monthly_target ||
    bill.min_payment ||
    bill.amount ||
    0
  );
}

/* ─────────────────────────────
   COMPONENT
──────────────────────────── */
export default function DashboardClient({
  profile,
  initialBills,
  initialDebts,
  initialSpend,
  initialIncome,
  initialPayments,
  user,
}: Props) {
  const [bills] = useState(initialBills || []);
  const [debts] = useState(initialDebts || []);
  const [spend] = useState(initialSpend || []);
  const [income] = useState(initialIncome || []);
  const [payments] = useState(initialPayments || []);

  const displayName =
    profile?.display_name || user?.email?.split("@")[0] || "there";

  const thisMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }, []);

  const monthlySpend = useMemo(() => {
    return spend
      .filter((s) => getMonthKey(s.date_iso || s.created_at) === thisMonthKey)
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [spend, thisMonthKey]);

  const monthlyIncome = useMemo(() => {
    return income
      .filter(
        (i) =>
          getMonthKey(i.date_iso || i.received_on || i.created_at) ===
          thisMonthKey
      )
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [income, thisMonthKey]);

  const netCashflow = monthlyIncome - monthlySpend;

  const recentActivity: ActivityItem[] = useMemo(() => {
    return [...spend, ...payments]
      .filter((i) => i.created_at)
      .sort(
        (a, b) =>
          new Date(b.created_at!).getTime() -
          new Date(a.created_at!).getTime()
      )
      .slice(0, 5);
  }, [spend, payments]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="max-w-5xl mx-auto space-y-6">

        {/* HEADER */}
        <h1 className="text-2xl font-semibold">
          Welcome back, {displayName}
        </h1>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card label="Income" value={monthlyIncome} color="text-emerald-400" />
          <Card label="Spend" value={monthlySpend} color="text-red-400" />
          <Card
            label="Net"
            value={netCashflow}
            color={netCashflow >= 0 ? "text-emerald-400" : "text-red-400"}
          />
        </div>

        {/* ACTIVITY */}
        <section className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <p className="text-zinc-500 text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex justify-between bg-zinc-800 p-3 rounded-lg"
                >
                  <div>
                    <p>
                      {isPayment(item)
                        ? item.note || "Payment"
                        : item.merchant || "Expense"}
                    </p>
                    <p className="text-xs text-zinc-400">
                      {formatDate(item.created_at)}
                    </p>
                  </div>
                  <p className="text-emerald-400">
                    ${item.amount.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   CARD
──────────────────────────── */
function Card({
  label,
  value,
  color,
}: {
  label: string;
  value: number;
  color: string;
}) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl border border-zinc-800">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>
        ${value.toLocaleString()}
      </p>
    </div>
  );
}
