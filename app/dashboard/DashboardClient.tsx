"use client";

console.log("DashboardClient mounted");

/* 
  NOTE:
  If you want the detailed log you wrote earlier, 
  we must place it *inside* the component, not at the top-level.
*/

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
   CLIENT COMPONENT
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

  // Your detailed console log MUST be inside the component:
  console.log("DashboardClient mounted", {
    bills: initialBills.length,
    debts: initialDebts.length,
    spend: initialSpend.length,
    income: initialIncome.length,
    payments: initialPayments.length,
    user,
    profile,
  });

  const [bills] = useState(initialBills);
  const [debts] = useState(initialDebts);
  const [spend] = useState(initialSpend);
  const [income] = useState(initialIncome);
  const [payments] = useState(initialPayments);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);

  const displayName = profile.display_name || user?.email?.split("@")[0] || "there";

  const thisMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }, []);

  /* ───────── AGGREGATES ───────── */
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
        const key = getMonthKeyFromDateString(s.date_iso) ?? getMonthKeyFromDateString(s.created_at);
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
      const key = getMonthKeyFromDateString(p.date_iso) ?? getMonthKeyFromDateString(p.created_at);
      if (key !== thisMonthKey) return;
      if (p.debt_id) debtTotal += p.amount || 0;
      else if (p.bill_id) billTotal += p.amount || 0;
    });
    return { billPaymentsThisMonth: billTotal, debtPaymentsThisMonth: debtTotal };
  }, [payments, thisMonthKey]);

  const upcoming = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const upcomingBills = bills
      .filter((b) => b.due_day != null)
      .map((b) => ({
        id: b.id,
        name: b.name,
        kind: "bill" as const,
        amount: getMonthlyBillAmount(b),
        dueDate: getNextDueDate(b.due_day!),
      }))
      .filter((item) => {
        const diffDays = (item.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      });

    const upcomingDebts = debts
      .filter((d) => d.due_day != null)
      .map((d) => ({
        id: d.id,
        name: d.name,
        kind: "debt" as const,
        amount: d.min_payment || 0,
        dueDate: getNextDueDate(d.due_day!),
      }))
      .filter((item) => {
        const diffDays = (item.dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7;
      });

    return [...upcomingBills, ...upcomingDebts].sort(
      (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
    );
  }, [bills, debts]);

  const benMood = netCashflow > 0 ? "relieved" : netCashflow > -200 ? "concerned" : "alarmed";

  /* ───────── UI ───────── */
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs text-zinc-400">
              Ben’s overview of your month, pressure, and what’s coming next.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setShowUpcomingModal(true)}
              className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-emerald-400 hover:border-emerald-400"
            >
              View upcoming (7 days)
            </button>
          </div>
        </header>

        <div className="text-center py-12 text-zinc-400">
          Dashboard loaded successfully with {bills.length} bills, {debts.length} debts, and {spend.length} spend entries.
        </div>
      </div>

      {showUpcomingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">Upcoming obligations</h2>
              <button onClick={() => setShowUpcomingModal(false)} className="text-zinc-400 hover:text-zinc-200 text-sm">
                Close
              </button>
            </div>
            <p className="text-sm text-zinc-500">Modal content goes here...</p>
          </div>
        </div>
      )}
    </main>
  );
}
