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
  created_at: string;
};

type IncomeEntry = {
  id: string;
  user_id: string;
  amount: number;
  source: string | null;
  date_iso: string | null;
  received_on: string | null;
  created_at: string;
};

type Bill = {
  id: string;
  user_id?: string;
  name: string;
  amount: number | null;
  target: number | null;
  monthly_target: number | null;
  min_payment: number | null;
  bill_type: string | null;
  category: string | null;
  due_day: number | null;
};

type Debt = {
  id: string;
  user_id?: string;
  name: string;
  min_payment: number | null;
  balance: number | null;
  due_day: number | null;
  category: string | null;
};

type Payment = {
  id: string;
  user_id: string;
  date_iso: string | null;
  merchant: string | null;
  amount: number;
  note: string | null;
  created_at: string;
  debt_id: string | null;
  bill_id: string | null;
};

type UpcomingItem = {
  id: string;
  name: string;
  kind: "bill" | "debt";
  amount: number;
  dueDate: Date;
};

type ActivityItem = SpendEntry | Payment;

type Props = {
  profile: {
    display_name: string | null;
    onboarding_complete: boolean;
    is_premium: boolean;
  };
  initialBills: Bill[];
  initialDebts: Debt[];
  initialSpend: SpendEntry[];
  initialIncome: IncomeEntry[];
  initialPayments: Payment[];
  user: any;
};

/* ─────────────────────────────
   TYPE GUARD (FIX)
──────────────────────────── */
function isPayment(item: ActivityItem): item is Payment {
  return "debt_id" in item || "bill_id" in item;
}

/* ─────────────────────────────
   HELPERS
──────────────────────────── */
function getNextDueDate(due_day: number) {
  const today = new Date();
  const currentDay = today.getDate();
  const dueDate = new Date(today);
  dueDate.setHours(0, 0, 0, 0);
  dueDate.setDate(due_day);
  if (due_day < currentDay) {
    dueDate.setMonth(dueDate.getMonth() + 1);
  }
  return dueDate;
}

function getMonthlyBillAmount(bill: Bill) {
  if (bill.target && bill.target > 0) return bill.target;
  if (bill.monthly_target && bill.monthly_target > 0) return bill.monthly_target;
  if (bill.min_payment && bill.min_payment > 0) return bill.min_payment;
  if (bill.amount && bill.amount > 0) return bill.amount;
  return 0;
}

function getMonthKeyFromDateString(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
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
  const [bills] = useState(initialBills);
  const [debts] = useState(initialDebts);
  const [spend] = useState(initialSpend);
  const [income] = useState(initialIncome);
  const [payments] = useState(initialPayments);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  const displayName =
    profile.display_name || user?.email?.split("@")[0] || "there";

  const thisMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }, []);

  const totalMonthlyBills = useMemo(
    () => bills.reduce((sum, b) => sum + getMonthlyBillAmount(b), 0),
    [bills]
  );

  const totalDebtMin = useMemo(
    () => debts.reduce((sum, d) => sum + (d.min_payment || 0), 0),
    [debts]
  );

  const monthlySpend = useMemo(() => {
    return spend
      .filter((s) => {
        const key =
          getMonthKeyFromDateString(s.date_iso) ??
          getMonthKeyFromDateString(s.created_at);
        return key === thisMonthKey;
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [spend, thisMonthKey]);

  const monthlyIncome = useMemo(() => {
    return income
      .filter((i) => {
        const key =
          getMonthKeyFromDateString(i.date_iso) ??
          getMonthKeyFromDateString(i.received_on) ??
          getMonthKeyFromDateString(i.created_at);
        return key === thisMonthKey;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [income, thisMonthKey]);

  const netCashflow = monthlyIncome - monthlySpend;

  const { billPaymentsThisMonth, debtPaymentsThisMonth } = useMemo(() => {
    let billTotal = 0;
    let debtTotal = 0;

    payments.forEach((p) => {
      const key =
        getMonthKeyFromDateString(p.date_iso) ??
        getMonthKeyFromDateString(p.created_at);

      if (key !== thisMonthKey) return;

      if (p.debt_id) debtTotal += p.amount;
      else if (p.bill_id) billTotal += p.amount;
    });

    return { billPaymentsThisMonth: billTotal, debtPaymentsThisMonth: debtTotal };
  }, [payments, thisMonthKey]);

  const upcoming: UpcomingItem[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const items = [
      ...bills
        .filter((b) => b.due_day != null)
        .map((b) => ({
          id: b.id,
          name: b.name,
          kind: "bill" as const,
          amount: getMonthlyBillAmount(b),
          dueDate: getNextDueDate(b.due_day!),
        })),
      ...debts
        .filter((d) => d.due_day != null)
        .map((d) => ({
          id: d.id,
          name: d.name,
          kind: "debt" as const,
          amount: d.min_payment || 0,
          dueDate: getNextDueDate(d.due_day!),
        })),
    ];

    return items
      .filter((item) => {
        const diff =
          (item.dueDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [bills, debts]);

  const benMood =
    netCashflow > 0
      ? "relieved"
      : netCashflow > -200
      ? "concerned"
      : "alarmed";

  const recentActivity: ActivityItem[] = useMemo(() => {
    return [...spend.slice(0, 5), ...payments.slice(0, 5)]
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 5);
  }, [spend, payments]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* HEADER */}
        <header className="flex justify-between">
          <h1 className="text-2xl font-semibold">
            Welcome back, {displayName}
          </h1>
        </header>

        {/* SUMMARY */}
        <section className="grid md:grid-cols-3 gap-4">
          <Card label="Income" value={monthlyIncome} color="text-emerald-400" />
          <Card label="Spend" value={monthlySpend} color="text-red-400" />
          <Card label="Net" value={netCashflow} color={netCashflow >= 0 ? "text-emerald-400" : "text-red-400"} />
        </section>

        {/* RECENT ACTIVITY */}
        <section className="bg-zinc-900 p-5 rounded-xl border border-zinc-800">
          <h2 className="text-lg font-semibold mb-3">Recent Activity</h2>

          <ul className="space-y-2">
            {recentActivity.map((item) => (
              <li
                key={item.id}
                className="flex justify-between bg-zinc-800 p-3 rounded-lg"
              >
                <div>
                  <p className="font-medium">
                    {isPayment(item)
                      ? item.note || "Payment"
                      : item.merchant || "Expense"}
                  </p>
                  <p className="text-xs text-zinc-400">
                    {new Date(item.created_at).toLocaleDateString()}
                  </p>
                </div>
                <p className="text-emerald-400 font-semibold">
                  ${item.amount.toLocaleString()}
                </p>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </main>
  );
}

/* ─────────────────────────────
   SMALL UI COMPONENT
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
    <div className="bg-zinc-900 border border-zinc-800 p-4 rounded-xl">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>
        ${value.toLocaleString()}
      </p>
    </div>
  );
}
