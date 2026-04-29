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

function getMonthKey(value: string | null): string | null {
  if (!value) return null;
  const d = new Date(value);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${d.getMonth() + 1}`;
}

function isPayment(item: ActivityItem): item is Payment {
  return "debt_id" in item || "bill_id" in item;
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

  /* ───────── MONTHLY AGGREGATES ───────── */
  const monthlySpend = useMemo(() => {
    return spend
      .filter((s) => getMonthKey(s.date_iso) === thisMonthKey)
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [spend, thisMonthKey]);

  const monthlyIncome = useMemo(() => {
    return income
      .filter((i) => {
        const key =
          getMonthKey(i.date_iso) ??
          getMonthKey(i.received_on) ??
          getMonthKey(i.created_at);
        return key === thisMonthKey;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [income, thisMonthKey]);

  const netCashflow = monthlyIncome - monthlySpend;

  const { billPaymentsThisMonth, debtPaymentsThisMonth } = useMemo(() => {
    let billTotal = 0;
    let debtTotal = 0;

    payments.forEach((p) => {
      const key = getMonthKey(p.date_iso) ?? getMonthKey(p.created_at);
      if (key !== thisMonthKey) return;

      if (p.debt_id) debtTotal += p.amount || 0;
      else if (p.bill_id) billTotal += p.amount || 0;
    });

    return { billPaymentsThisMonth: billTotal, debtPaymentsThisMonth: debtTotal };
  }, [payments, thisMonthKey]);

  /* ───────── UPCOMING ───────── */
  const upcoming: UpcomingItem[] = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const billItems = bills
      .filter((b) => b.due_day != null)
      .map((b) => ({
        id: b.id,
        name: b.name,
        kind: "bill" as const,
        amount: getMonthlyBillAmount(b),
        dueDate: getNextDueDate(b.due_day!),
      }));

    const debtItems = debts
      .filter((d) => d.due_day != null)
      .map((d) => ({
        id: d.id,
        name: d.name,
        kind: "debt" as const,
        amount: d.min_payment || 0,
        dueDate: getNextDueDate(d.due_day!),
      }));

    return [...billItems, ...debtItems]
      .filter((item) => {
        const diff =
          (item.dueDate.getTime() - today.getTime()) /
          (1000 * 60 * 60 * 24);
        return diff >= 0 && diff <= 7;
      })
      .sort((a, b) => a.dueDate.getTime() - b.dueDate.getTime());
  }, [bills, debts]);

  /* ───────── RECENT ACTIVITY ───────── */
  const recentActivity: ActivityItem[] = useMemo(() => {
    return [...spend, ...payments]
      .filter((x) => x.created_at)
      .sort(
        (a, b) =>
          new Date(b.created_at).getTime() -
          new Date(a.created_at).getTime()
      )
      .slice(0, 6);
  }, [spend, payments]);

  /* ───────── BEN MOOD ───────── */
  const benMood =
    netCashflow > 0 ? "relieved" : netCashflow > -200 ? "concerned" : "alarmed";

  /* ─────────────────────────────
       UI
  ───────────────────────────── */
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* HEADER */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Welcome back, {displayName}
            </h1>
            <p className="text-xs text-zinc-400">
              Ben’s overview of your month, pressure, and what’s coming next.
            </p>
          </div>

          <button
            onClick={() => setShowUpcomingModal(true)}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-emerald-400 hover:border-emerald-400"
          >
            View upcoming (7 days)
          </button>
        </header>

        {/* SUMMARY ROW */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <SummaryCard label="Monthly Income" value={monthlyIncome} tone="good" />
          <SummaryCard label="Monthly Spend" value={monthlySpend} tone="bad" />
          <SummaryCard
            label="Net Cashflow"
            value={netCashflow}
            tone={netCashflow >= 0 ? "good" : "bad"}
          />
        </section>

        {/* BEN'S TAKE */}
        <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-2">
          <h2 className="text-lg font-semibold">Ben’s Take</h2>
          <p className="text-sm text-zinc-400">
            {benMood === "relieved" &&
              "Good news — your month is looking stable. Keep this momentum going."}
            {benMood === "concerned" &&
              "You’re close to breaking even. A few adjustments could stabilize things."}
            {benMood === "alarmed" &&
              "Your spending is outpacing income. Let’s focus on the biggest pressure points."}
          </p>
        </section>

        {/* UPCOMING */}
        <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Upcoming (7 days)</h2>
            <button
              onClick={() => setShowUpcomingModal(true)}
              className="text-xs text-emerald-400 hover:text-emerald-300"
            >
              View all
            </button>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-sm text-zinc-500">Nothing due in the next week.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-800 p-3"
                >
                  <div>
                    <p className="font-medium">{item.name}</p>
                    <p className="text-xs text-zinc-400">
                      Due {item.dueDate.toLocaleDateString()}
                    </p>
                  </div>
                  <p className="font-semibold text-emerald-400">
                    ${item.amount.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* PAYMENTS THIS MONTH */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <SummaryCard
            label="Bill Payments (This Month)"
            value={billPaymentsThisMonth}
            tone="good"
          />
          <SummaryCard
            label="Debt Payments (This Month)"
            value={debtPaymentsThisMonth}
            tone="good"
          />
        </section>

        {/* RECENT ACTIVITY */}
        <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>

          {recentActivity.length === 0 ? (
            <p className="text-sm text-zinc-500">No recent activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {recentActivity.map((item) => (
                <li
                  key={item.id}
                  className="flex items-center justify-between rounded-lg bg-zinc-800 p-3"
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
                  <p className="font-semibold text-emerald-400">
                    ${item.amount.toLocaleString()}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {/* UPCOMING MODAL */}
      {showUpcomingModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl bg-zinc-900 border border-zinc-800 p-5 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-semibold text-white">
                Upcoming obligations
              </h2>
              <button
                onClick={() => setShowUpcomingModal(false)}
                className="text-zinc-400 hover:text-zinc-200 text-sm"
              >
                Close
              </button>
            </div>

            {upcoming.length === 0 ? (
              <p className="text-sm text-zinc-500">
                Nothing due in the next 7 days.
              </p>
            ) : (
              <ul className="space-y-2">
                {upcoming.map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-800 p-3"
                  >
                    <div>
                      <p className="font-medium">{item.name}</p>
                      <p className="text-xs text-zinc-400">
                        Due {item.dueDate.toLocaleDateString()}
                      </p>
                    </div>
                    <p className="font-semibold text-emerald-400">
                      ${item.amount.toLocaleString()}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

/* ─────────────────────────────
   SUMMARY CARD
──────────────────────────── */
function SummaryCard({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "good" | "bad";
}) {
  const color =
    tone === "good" ? "text-emerald-400" : "text-red-400";

  return (
    <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={`text-2xl font-semibold ${color}`}>
        ${value.toLocaleString()}
      </p>
    </div>
  );
}
