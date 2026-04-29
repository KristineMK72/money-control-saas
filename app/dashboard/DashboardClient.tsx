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

  const benMood =
    netCashflow > 0 ? "relieved" : netCashflow > -200 ? "concerned" : "alarmed";

  /* ─────────────────────────────
      HEALTH SCORE + PRESSURE
  ───────────────────────────── */
  const totalObligations = billPaymentsThisMonth + debtPaymentsThisMonth;
  const obligationRatio = monthlyIncome > 0 ? totalObligations / monthlyIncome : 1;

  const healthScore = useMemo(() => {
    if (monthlyIncome === 0 && monthlySpend === 0) return 50;
    let score = 80;

    const spendRatio = monthlyIncome > 0 ? monthlySpend / monthlyIncome : 1;
    score -= Math.max(0, (spendRatio - 0.7) * 60);
    score -= Math.max(0, (obligationRatio - 0.4) * 80);

    return Math.max(0, Math.min(100, Math.round(score)));
  }, [monthlyIncome, monthlySpend, obligationRatio]);

  const pressureLevel =
    healthScore >= 75 ? "low" : healthScore >= 50 ? "moderate" : "high";

  /* ─────────────────────────────
      UI
  ───────────────────────────── */
  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">

        {/* BEN + HEALTH SUMMARY */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4 items-stretch">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex gap-3 items-center">
            <div className="h-12 w-12 rounded-full bg-gradient-to-br from-emerald-500 to-emerald-300 flex items-center justify-center text-xl">
              B
            </div>
            <div className="space-y-1">
              <p className="text-xs uppercase tracking-wide text-zinc-500">
                Ben’s mood
              </p>
              <p className="text-sm font-medium">
                {benMood === "relieved" && "Relieved — you’re in a decent spot."}
                {benMood === "concerned" && "Concerned — you’re on the edge."}
                {benMood === "alarmed" && "Alarmed — pressure is building fast."}
              </p>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between">
            <div className="flex items-center justify-between">
              <p className="text-xs text-zinc-400">Financial health score</p>
              <p className="text-xs text-zinc-500">
                {pressureLevel === "low" && "Low pressure"}
                {pressureLevel === "moderate" && "Moderate pressure"}
                {pressureLevel === "high" && "High pressure"}
              </p>
            </div>
            <div className="mt-2 flex items-end gap-3">
              <p className="text-3xl font-semibold text-emerald-400">
                {healthScore}
              </p>
              <p className="text-xs text-zinc-500 mb-1">/ 100</p>
            </div>
            <div className="mt-3 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className={`h-full transition-all duration-700 ${
                  healthScore >= 75
                    ? "bg-emerald-400"
                    : healthScore >= 50
                    ? "bg-amber-400"
                    : "bg-red-500"
                }`}
                style={{ width: `${healthScore}%` }}
              />
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 flex flex-col justify-between">
            <p className="text-xs text-zinc-400 mb-2">Monthly pressure</p>
            <p className="text-sm text-zinc-400">
              Obligations (bills + debts) vs income.
            </p>
            <div className="mt-3 h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
              <div
                className="h-full transition-all duration-700"
                style={{
                  width: `${Math.min(100, Math.round(obligationRatio * 100))}%`,
                  backgroundColor:
                    obligationRatio <= 0.4
                      ? "#22c55e"
                      : obligationRatio <= 0.7
                      ? "#facc15"
                      : "#ef4444",
                }}
              />
            </div>
            <p className="mt-2 text-xs text-zinc-500">
              {Math.round(obligationRatio * 100)}% of income committed.
            </p>
          </div>
        </section>

        {/* TOP SUMMARY ROW */}
        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400">Monthly Income</p>
            <p className="text-2xl font-semibold text-emerald-400">
              ${monthlyIncome.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400">Monthly Spend</p>
            <p className="text-2xl font-semibold text-red-400">
              ${monthlySpend.toLocaleString()}
            </p>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4">
            <p className="text-xs text-zinc-400">Net Cashflow</p>
            <p
              className={`text-2xl font-semibold ${
                netCashflow >= 0 ? "text-emerald-400" : "text-red-400"
              }`}
            >
              ${netCashflow.toLocaleString()}
            </p>
          </div>
        </section>

        {/* INCOME VS SPEND + BILLS VS DEBT */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <p className="text-xs text-zinc-400">Income vs Spend</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Income</span>
                <span>${monthlyIncome.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div className="h-full bg-emerald-400 transition-all duration-700" style={{ width: "100%" }} />
              </div>

              <div className="flex justify-between text-xs text-zinc-500 mt-3">
                <span>Spend</span>
                <span>${monthlySpend.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-red-400 transition-all duration-700"
                  style={{
                    width:
                      monthlyIncome > 0
                        ? `${Math.min(100, Math.round((monthlySpend / monthlyIncome) * 100))}%`
                        : "100%",
                  }}
                />
              </div>
            </div>
          </div>

          <div className="rounded-xl bg-zinc-900 border border-zinc-800 p-4 space-y-3">
            <p className="text-xs text-zinc-400">Bills vs Debt Payments</p>
            <div className="space-y-2">
              <div className="flex justify-between text-xs text-zinc-500">
                <span>Bills</span>
                <span>${billPaymentsThisMonth.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-sky-400 transition-all duration-700"
                  style={{
                    width:
                      billPaymentsThisMonth + debtPaymentsThisMonth > 0
                        ? `${Math.round(
                            (billPaymentsThisMonth /
                              (billPaymentsThisMonth + debtPaymentsThisMonth)) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>

              <div className="flex justify-between text-xs text-zinc-500 mt-3">
                <span>Debt</span>
                <span>${debtPaymentsThisMonth.toLocaleString()}</span>
              </div>
              <div className="h-2 w-full rounded-full bg-zinc-800 overflow-hidden">
                <div
                  className="h-full bg-purple-400 transition-all duration-700"
                  style={{
                    width:
                      billPaymentsThisMonth + debtPaymentsThisMonth > 0
                        ? `${Math.round(
                            (debtPaymentsThisMonth /
                              (billPaymentsThisMonth + debtPaymentsThisMonth)) *
                              100
                          )}%`
                        : "0%",
                  }}
                />
              </div>
            </div>
          </div>
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
            </button
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

        {/* RECENT ACTIVITY */}
        <section className="rounded-xl bg-zinc-900 border border-zinc-800 p-5 space-y-3">
          <h2 className="text-lg font-semibold">Recent Activity</h2>

          {spend.length === 0 && payments.length === 0 ? (
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div
                  key={i}
                  className="flex items-center justify-between rounded-lg bg-zinc-800 p-3 animate-pulse"
                >
                  <div className="space-y-2">
                    <div className="h-3 w-32 rounded bg-zinc-700" />
                    <div className="h-2 w-20 rounded bg-zinc-800" />
                  </div>
                  <div className="h-4 w-16 rounded bg-zinc-700" />
                </div>
              ))}
            </div>
          ) : (
            <ul className="space-y-2">
              {([...spend.slice(0, 5), ...payments.slice(0, 5)] as (SpendEntry | Payment)[])
                .sort(
                  (a, b) =>
                    new Date(b.created_at).getTime() -
                    new Date(a.created_at).getTime()
                )
                .slice(0, 5)
                .map((item) => (
                  <li
                    key={item.id}
                    className="flex items-center justify-between rounded-lg bg-zinc-800 p-3"
                  >
                    <div>
                      <p className="font-medium">
                        {"merchant" in item
                          ? item.merchant
                          : item.note || "Payment"}
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
              <p className="text-sm text-zinc-500">Nothing due soon.</p>
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

