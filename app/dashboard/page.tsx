"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type PriorityItem = {
  id: string;
  name: string;
  amount: number;
  due_date: string | null;
  type: "bill" | "debt";
};

export default function DashboardPage() {
  const [priorities, setPriorities] = useState<PriorityItem[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadPriorities();
  }, []);

  async function loadPriorities() {
    setLoading(true);

    const { data: bills } = await supabase
      .from("bills")
      .select("*");

    const { data: debts } = await supabase
      .from("debts")
      .select("*");

    const today = new Date();
    const next7 = new Date();
    next7.setDate(today.getDate() + 7);

    const priorityList: PriorityItem[] = [];

    bills?.forEach((b: any) => {
      if (!b.due_date) return;

      const due = new Date(b.due_date);

      if (due <= next7) {
        priorityList.push({
          id: b.id,
          name: b.name,
          amount: Number(b.target || 0),
          due_date: b.due_date,
          type: "bill",
        });
      }
    });

    debts?.forEach((d: any) => {
      if (!d.due_day) return;

      const due = new Date();
      due.setDate(d.due_day);

      if (due <= next7) {
        priorityList.push({
          id: d.id,
          name: d.name,
          amount: Number(d.min_payment || 0),
          due_date: due.toISOString(),
          type: "debt",
        });
      }
    });

    priorityList.sort(
      (a, b) =>
        new Date(a.due_date || "").getTime() -
        new Date(b.due_date || "").getTime()
    );

    setPriorities(priorityList);
    setLoading(false);
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">

        {/* Header */}

        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Dashboard
            </h1>

            <p className="mt-2 text-zinc-600">
              See what needs attention first.
            </p>
          </div>
        </div>

        {/* Navigation */}

        <div className="mt-6 flex flex-wrap gap-3">

          <a
            href="/bills"
            className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            Bills
          </a>

          <a
            href="/income"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Income
          </a>

          <a
            href="/spend"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Spending
          </a>

          <a
            href="/debt"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Credit & Loans
          </a>

          <a
            href="/forecast"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Forecast
          </a>

          <a
            href="/crisis"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Crisis Mode
          </a>

        </div>

        {/* Priorities */}

        <div className="mt-10 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-xl font-bold">
            Today's Financial Priorities
          </h2>

          {loading && (
            <p className="mt-4 text-zinc-500">
              Loading priorities...
            </p>
          )}

          {!loading && priorities.length === 0 && (
            <p className="mt-4 text-zinc-500">
              No urgent payments in the next 7 days.
            </p>
          )}

          <div className="mt-4 grid gap-3">

            {priorities.map((p) => (
              <div
                key={p.id}
                className="flex items-center justify-between rounded-xl bg-zinc-50 p-4"
              >
                <div>

                  <div className="font-semibold">
                    {p.name}
                  </div>

                  <div className="text-sm text-zinc-500">
                    Due {p.due_date?.slice(0, 10)}
                  </div>

                </div>

                <div className="text-lg font-bold">
                  ${p.amount.toFixed(2)}
                </div>

              </div>
            ))}

          </div>

        </div>

      </div>
    </main>
  );
}
