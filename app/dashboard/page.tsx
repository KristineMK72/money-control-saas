"use client";

import { useEffect, useState } from "react";
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";

type Bill = {
  id: string;
  name: string;
  amount: number;
  due_day: number | null; // 1–31
};

type Debt = {
  id: string;
  name: string;
  min_payment: number;
  due_day: number | null; // 1–31
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

export default function DashboardPage() {
  const supabase = createClientComponentClient();
  const [bills, setBills] = useState<Bill[]>([]);
  const [debts, setDebts] = useState<Debt[]>([]);
  const [loading, setLoading] = useState(true);
  const [showUpcomingModal, setShowUpcomingModal] = useState(false);
  const [upcoming, setUpcoming] = useState<UpcomingItem[]>([]);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);

      const { data: billsData } = await supabase
        .from("bills")
        .select("id, name, amount, due_day");

      const { data: debtsData } = await supabase
        .from("debts")
        .select("id, name, min_payment, due_day");

      const billsSafe = (billsData ?? []) as Bill[];
      const debtsSafe = (debtsData ?? []) as Debt[];

      setBills(billsSafe);
      setDebts(debtsSafe);

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const upcomingBills: UpcomingItem[] = billsSafe
        .filter((b) => b.due_day != null)
        .map((b) => {
          const dueDate = getNextDueDate(b.due_day!);
          return {
            id: b.id,
            name: b.name,
            kind: "bill",
            amount: b.amount,
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
            kind: "debt",
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

  const totalBillAmount = bills.reduce((sum, b) => sum + (b.amount || 0), 0);
  const totalDebtMin = debts.reduce(
    (sum, d) => sum + (d.min_payment || 0),
    0
  );

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto w-full max-w-5xl space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Dashboard
            </h1>
            <p className="text-xs text-zinc-400">
              Ben’s overview of what’s coming up and where your money is going.
            </p>
          </div>

          <button
            onClick={() => setShowUpcomingModal(true)}
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-emerald-400 hover:border-emerald-400"
          >
            View upcoming (7 days)
          </button>
        </header>

        {loading ? (
          <div className="text-sm text-zinc-500">Loading your data…</div>
        ) : (
          <div className="grid gap-4 md:grid-cols-3">
            <section className="col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
              <div className="text-xs font-semibold text-zinc-400">
                Monthly bills
              </div>
              <div className="text-2xl font-semibold">
                ${totalBillAmount.toFixed(0)}
              </div>
              <p className="text-xs text-zinc-500">
                Fixed obligations like rent, utilities, subscriptions.
              </p>
            </section>

            <section className="col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
              <div className="text-xs font-semibold text-zinc-400">
                Debt minimums
              </div>
              <div className="text-2xl font-semibold">
                ${totalDebtMin.toFixed(0)}
              </div>
              <p className="text-xs text-zinc-500">
                Minimum payments across cards and loans.
              </p>
            </section>

            <section className="col-span-1 rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
              <div className="text-xs font-semibold text-zinc-400">
                Upcoming (7 days)
              </div>
              <div className="text-2xl font-semibold">
                {upcoming.length} item{upcoming.length === 1 ? "" : "s"}
              </div>
              <p className="text-xs text-zinc-500">
                Bills and debts due in the next week.
              </p>
            </section>
          </div>
        )}

        {/* You can add charts / more panels below here */}
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
