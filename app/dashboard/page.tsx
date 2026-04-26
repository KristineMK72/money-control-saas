"use client";

import { useEffect, useMemo, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Bill = {
  id: string;
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
  name: string;
  min_payment: number;
  balance: number | null;
  due_day: number | null;
  category: string | null;
};

type Spend = {
  id: string;
  amount: number;
  category: string | null;
  occurred_on: string;
};

type Income = {
  id: string;
  amount: number;
  source: string | null;
  received_on: string;
};

type UpcomingItem = {
  id: string;
  name: string;
  kind: "bill" | "debt";
  amount: number;
  dueDate: Date;
};

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

export default function DashboardPage() {
  const supabase = createClientComponentClient();

  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [spend, setSpend] = useState<Spend[]>([]);
  const [income, setIncome] = useState<Income[]>([]);
  const [loading, setLoading] = useState(true);

  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const [{ data: billsData }, { data: debtsData }, { data: spendData }, { data: incomeData }] =
        await Promise.all([
          supabase
            .from("bills")
            .select(
              "id, name, amount, target, monthly_target, min_payment, bill_type, category, due_day"
            ),
          supabase
            .from("debts")
            .select("id, name, min_payment, balance, due_day, category"),
          supabase
            .from("spend")
            .select("id, amount, category, occurred_on")
            .order("occurred_on", { ascending: false })
            .limit(50),
          supabase
            .from("income")
            .select("id, amount, source, received_on")
            .order("received_on", { ascending: false })
            .limit(50),
        ]);

      const billsSafe = (billsData ?? []) as Bill[];
      const debtsSafe = (debtsData ?? []) as Debt[];
      const spendSafe = (spendData ?? []) as Spend[];
      const incomeSafe = (incomeData ?? []) as Income[];

      setBills(billsSafe);
      setDebts(debtsSafe);
      setSpend(spendSafe);
      setIncome(incomeSafe);

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
            amount: d.min_payment,
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

  const totalMonthlyBills = useMemo(
    () => bills.reduce((sum, b) => sum + getMonthlyBillAmount(b), 0),
    [bills]
  );

  const totalDebtMin = useMemo(
    () => debts.reduce((sum, d) => sum + (d.min_payment || 0), 0),
    [debts]
  );

  const thisMonthKey = useMemo(() => {
    const now = new Date();
    return `${now.getFullYear()}-${now.getMonth() + 1}`;
  }, []);

  const monthlySpend = useMemo(() => {
    return spend
      .filter((s) => {
        const d = new Date(s.occurred_on);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        return key === thisMonthKey;
      })
      .reduce((sum, s) => sum + (s.amount || 0), 0);
  }, [spend, thisMonthKey]);

  const monthlyIncome = useMemo(() => {
    return income
      .filter((i) => {
        const d = new Date(i.received_on);
        const key = `${d.getFullYear()}-${d.getMonth() + 1}`;
        return key === thisMonthKey;
      })
      .reduce((sum, i) => sum + (i.amount || 0), 0);
  }, [income, thisMonthKey]);

  const netPosition = monthlyIncome - monthlySpend - totalMonthlyBills - totalDebtMin;

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
    netPosition > 0
      ? "relieved"
      : netPosition > -200
      ? "concerned"
      : "alarmed";

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
                    netPosition >= 0 ? "text-emerald-400" : "text-rose-400"
                  }`}
                >
                  Net: {netPosition >= 0 ? "+" : "-"}$
                  {Math.abs(netPosition).toFixed(0)}
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

            {/* BenPersona + upcoming pressure */}
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
                  {netPosition >= 0 ? (
                    <>
                      This month is net positive so far. You’ve got some room to
                      breathe — I’d still keep an eye on clusters of bills and
                      avoid letting variable spend creep up.
                    </>
                  ) : netPosition > -200 ? (
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
                  I’m watching your bills, debts, and spend together — not in
                  isolation.
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
                            {s.category || "Uncategorized"}
                          </div>
                        </div>
                        <div className="text-[11px] text-zinc-500">
                          {new Date(s.occurred_on).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
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
                          {new Date(i.received_on).toLocaleDateString(
                            undefined,
                            { month: "short", day: "numeric" }
                          )}
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
