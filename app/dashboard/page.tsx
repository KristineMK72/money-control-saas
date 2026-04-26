"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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
   PAGE
──────────────────────────── */

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [spend, setSpend] = useState<SpendEntry[]>([]);
  const [income, setIncome] = useState<IncomeEntry[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [
        { data: billsData },
        { data: debtsData },
        { data: spendData },
        { data: incomeData },
        { data: paymentsData },
      ] = await Promise.all([
        supabase.from("bills").select("*"),
        supabase.from("debts").select("*"),
        supabase
          .from("spend_entries")
          .select("*")
          .order("date_iso", { ascending: false })
          .limit(100),
        supabase
          .from("income_entries")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(100),
        supabase
          .from("payments")
          .select("*")
          .order("date_iso", { ascending: false })
          .limit(200),
      ]);

      const billsSafe = (billsData ?? []) as Bill[];
      const debtsSafe = (debtsData ?? []) as Debt[];
      const spendSafe = (spendData ?? []) as SpendEntry[];
      const incomeSafe = (incomeData ?? []) as IncomeEntry[];
      const paymentsSafe = (paymentsData ?? []) as Payment[];

      setBills(billsSafe);
      setDebts(debtsSafe);
      setSpend(spendSafe);
      setIncome(incomeSafe);
      setPayments(paymentsSafe);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingBills: UpcomingItem[] = billsSafe
        .filter((b) => b.due_day != null)
        .map((b) => {
          const dueDate = getNextDueDate(b.due_day!);
          return {
            id: b.id,
            name: b.name,
            kind: "bill" as const,
            amount: getMonthlyBillAmount(b),
            dueDate,
          };
        })
        .filter((item) => {
          const diffDays =
            (item.dueDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        });

      const upcomingDebts: UpcomingItem[] = debtsSafe
        .filter((d) => d.due_day != null)
        .map((d) => {
          const dueDate = getNextDueDate(d.due_day!);
          return {
            id: d.id,
            name: d.name,
            kind: "debt" as const,
            amount: d.min_payment || 0,
            dueDate,
          };
        })
        .filter((item) => {
          const diffDays =
            (item.dueDate.getTime() - today.getTime()) /
            (1000 * 60 * 60 * 24);
          return diffDays >= 0 && diffDays <= 7;
        });

      const merged = [...upcomingBills, ...upcomingDebts].sort(
        (a, b) => a.dueDate.getTime() - b.dueDate.getTime()
      );

      setUpcoming(merged);
      setLoading(false);
    };

    loadData();
  }, [supabase]);

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

  // HYBRID: cashflow = income - spend (payments separate)
  const netCashflow = monthlyIncome - monthlySpend;

  const { billPaymentsThisMonth, debtPaymentsThisMonth } = useMemo(() => {
    let billTotal = 0;
    let debtTotal = 0;

    payments.forEach((p) => {
      const key =
        getMonthKeyFromDateString(p.date_iso) ??
        getMonthKeyFromDateString(p.created_at);
      if (key !== thisMonthKey) return;

      if (p.debt_id) {
        debtTotal += p.amount || 0;
      } else if (p.bill_id) {
        billTotal += p.amount || 0;
      }
    });

    return {
      billPaymentsThisMonth: billTotal,
      debtPaymentsThisMonth: debtTotal,
    };
  }, [payments, thisMonthKey]);

  const spendByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const s of spend) {
      const key = s.category || "Uncategorized";
      map.set(key, (map.get(key) || 0) + (s.amount || 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [spend]);

  const billsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const b of bills) {
      const key = b.category || "Uncategorized";
      map.set(key, (map.get(key) || 0) + getMonthlyBillAmount(b));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [bills]);

  const debtsByCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const d of debts) {
      const key = d.category || "Uncategorized";
      map.set(key, (map.get(key) || 0) + (d.min_payment || 0));
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [debts]);

  const dailyNeed = useMemo(() => {
    const now = new Date();
    const daysInMonth = new Date(
      now.getFullYear(),
      now.getMonth() + 1,
      0
    ).getDate();
    const remainingDays = daysInMonth - now.getDate() + 1;

    const required = totalMonthlyBills + totalDebtMin;
    const remainingRequired = Math.max(required - monthlyIncome, 0);

    return remainingDays > 0 ? remainingRequired / remainingDays : remainingRequired;
  }, [totalMonthlyBills, totalDebtMin, monthlyIncome]);

  const benMood =
    netCashflow > 0
      ? "relieved"
      : netCashflow > -200
      ? "concerned"
      : "alarmed";

  /* ───────── UI ───────── */

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-6xl space-y-6">
        {/* Header */}
        <header className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
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

        {loading ? (
          <div className="text-sm text-zinc-500">Loading your data…</div>
        ) : (
          <>
            {/* Top summary row */}
            <div className="grid gap-4 md:grid-cols-4">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  Monthly bills
                </div>
                <div className="text-2xl font-semibold">
                  ${totalMonthlyBills.toFixed(0)}
                </div>
                <p className="text-xs text-zinc-500">
                  Fixed obligations, subscriptions, and sinking funds.
                </p>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  Debt minimums
                </div>
                <div className="text-2xl font-semibold">
                  ${totalDebtMin.toFixed(0)}
                </div>
                <p className="text-xs text-zinc-500">
                  Minimums across cards and loans.
                </p>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  This month’s cashflow
                </div>
                <div className="text-sm text-zinc-300">
                  <div>Income: ${monthlyIncome.toFixed(0)}</div>
                  <div>Spend: ${monthlySpend.toFixed(0)}</div>
                </div>
                <div
                  className={`text-xs font-semibold ${
                    netCashflow >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  Net: {netCashflow >= 0 ? "+" : "-"}$
                  {Math.abs(netCashflow).toFixed(0)}
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  Daily need (rest of month)
                </div>
                <div className="text-2xl font-semibold">
                  ${dailyNeed.toFixed(0)}
                </div>
                <p className="text-xs text-zinc-500">
                  What you’d need to bring in per day to cover bills + minimums.
                </p>
              </section>
            </div>

            {/* BenPersona + upcoming */}
            <div className="grid gap-4 md:grid-cols-3">
              <section className="md:col-span-2 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-400">
                    Ben’s take
                  </div>
                  <span className="text-[10px] uppercase tracking-wide text-zinc-500">
                    Mood: {benMood}
                  </span>
                </div>
                <div className="text-sm text-zinc-100">
                  {netCashflow >= 0 ? (
                    <>
                      This month is net positive so far. You’ve got some room to
                      breathe — I’d still keep an eye on clusters of bills and
                      avoid letting variable spend creep up.
                    </>
                  ) : netCashflow > -200 ? (
                    <>
                      You’re running a little tight. I’d triage upcoming bills,
                      look for one or two flexible spends to trim, and make sure
                      income dates line up with your biggest obligations.
                    </>
                  ) : (
                    <>
                      This month is under heavy pressure. I’d prioritize housing,
                      utilities, and minimums, then we can talk about deferring,
                      pausing, or restructuring anything that isn’t essential.
                    </>
                  )}
                </div>
                <div className="text-xs text-zinc-500">
                  I’m watching your bills, debts, spend, and payments together —
                  not in isolation.
                </div>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-zinc-400">
                    Upcoming (7 days)
                  </div>
                  <button
                    onClick={() => setShowUpcomingModal(true)}
                    className="text-[10px] text-emerald-400 hover:text-emerald-300"
                  >
                    View all
                  </button>
                </div>
                <div className="text-2xl font-semibold">
                  {upcoming.length} item{upcoming.length === 1 ? "" : "s"}
                </div>
                {upcoming.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    Nothing due in the next week. That’s rare — enjoy it.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-40 overflow-y-auto">
                    {upcoming.slice(0, 4).map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2"
                      >
                        <div>
                          <div className="text-xs font-medium text-white">
                            {item.name}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {item.kind === "debt" ? "Minimum" : "Amount"}: $
                            {item.amount.toFixed(0)}
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-[11px] text-zinc-400">
                            {item.dueDate.toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </div>
                          <div className="text-[10px] uppercase tracking-wide text-zinc-500">
                            {item.kind}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Payments cards */}
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  Debt payments this month
                </div>
                <div className="text-2xl font-semibold">
                  ${debtPaymentsThisMonth.toFixed(0)}
                </div>
                <p className="text-xs text-zinc-500">
                  Total paid toward debts this month. This reduces balances but
                  isn’t counted as “spend” in cashflow.
                </p>
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-2">
                <div className="text-xs font-semibold text-zinc-400">
                  Bill payments this month
                </div>
                <div className="text-2xl font-semibold">
                  ${billPaymentsThisMonth.toFixed(0)}
                </div>
                <p className="text-xs text-zinc-500">
                  Total paid toward bills this month. Helps track progress
                  against your monthly obligations.
                </p>
              </section>
            </div>

            {/* Category overviews */}
            <div className="grid gap-4 md:grid-cols-3">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="text-xs font-semibold text-zinc-400">
                  Spend by category (recent)
                </div>
                {spendByCategory.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No recent spend recorded.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {spendByCategory.slice(0, 5).map(([cat, total]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-300">{cat}</span>
                        <span className="text-zinc-100">
                          ${total.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="text-xs font-semibold text-zinc-400">
                  Bills by category (monthly)
                </div>
                {billsByCategory.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No bills configured yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {billsByCategory.slice(0, 5).map(([cat, total]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-300">{cat}</span>
                        <span className="text-zinc-100">
                          ${total.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="text-xs font-semibold text-zinc-400">
                  Debt minimums by category
                </div>
                {debtsByCategory.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No debts configured yet.
                  </p>
                ) : (
                  <div className="space-y-2">
                    {debtsByCategory.slice(0, 5).map(([cat, total]) => (
                      <div
                        key={cat}
                        className="flex items-center justify-between text-xs"
                      >
                        <span className="text-zinc-300">{cat}</span>
                        <span className="text-zinc-100">
                          ${total.toFixed(0)}
                        </span>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>

            {/* Recent activity */}
            <div className="grid gap-4 md:grid-cols-2">
              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="text-xs font-semibold text-zinc-400">
                  Recent spend
                </div>
                {spend.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No spend recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {spend.slice(0, 10).map((s) => (
                      <div
                        key={s.id}
                        className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-1 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <div className="text-zinc-200">
                            ${s.amount.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {s.merchant || "Merchant"} •{" "}
                            {s.category || "Uncategorized"}
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {new Date(
                            s.date_iso || s.created_at
                          ).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-zinc-800 bg-zinc-900/80 p-4 space-y-3">
                <div className="text-xs font-semibold text-zinc-400">
                  Recent income
                </div>
                {income.length === 0 ? (
                  <p className="text-xs text-zinc-500">
                    No income recorded yet.
                  </p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto">
                    {income.slice(0, 10).map((i) => (
                      <div
                        key={i.id}
                        className="flex items-center justify-between text-xs border-b border-zinc-800/60 pb-1 last:border-b-0 last:pb-0"
                      >
                        <div>
                          <div className="text-zinc-200">
                            ${i.amount.toFixed(2)}
                          </div>
                          <div className="text-[11px] text-zinc-500">
                            {i.source || "Income"}
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {new Date(
                            i.date_iso || i.received_on || i.created_at
                          ).toLocaleDateString(undefined, {
                            month: "short",
                            day: "numeric",
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </section>
            </div>
          </>
        )}
      </div>

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
                Nothing due in the next 7 days. Enjoy the breathing room.
              </p>
            ) : (
              <div className="space-y-3 max-h-80 overflow-y-auto">
                {upcoming.map((item) => (
                  <div
                    key={item.id}
                    className="rounded-lg border border-zinc-800 bg-zinc-950/60 p-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium text-white">
                        {item.name}
                      </span>
                      <span className="text-xs text-zinc-400">
                        {item.dueDate.toLocaleDateString(undefined, {
                          month: "short",
                          day: "numeric",
                        })}
                      </span>
                    </div>
                    <div className="mt-1 flex items-center justify-between text-xs text-zinc-400">
                      <span>
                        {item.kind === "debt" ? "Minimum" : "Amount"}:{" "}
                        <span className="text-zinc-200">
                          ${item.amount.toFixed(2)}
                        </span>
                      </span>
                      <span className="uppercase tracking-wide text-[10px] text-zinc-500">
                        {item.kind}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="pt-2 text-xs text-zinc-500 border-t border-zinc-800">
              Ben: I’ll keep an eye on these and warn you if anything clusters
              too tightly.
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
