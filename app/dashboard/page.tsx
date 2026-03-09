"use client";

import { useMoneyStore } from "@/lib/money/store";
import { getPriorityBuckets } from "@/lib/money/priority";

export default function DashboardPage() {
  const { buckets, totals } = useMoneyStore();
  const priorities = getPriorityBuckets(buckets).slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
        <p className="mt-2 text-zinc-600">
          Calm overview of what matters most right now.
        </p>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm text-zinc-500">Income</div>
            <div className="mt-2 text-3xl font-black">${totals.income.toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm text-zinc-500">Spending</div>
            <div className="mt-2 text-3xl font-black">${totals.spending.toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5">
            <div className="text-sm text-zinc-500">Payments</div>
            <div className="mt-2 text-3xl font-black">${totals.payments.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5">
          <h2 className="text-lg font-bold">Pay these first</h2>
          <div className="mt-4 grid gap-3">
            {priorities.length === 0 ? (
              <div className="rounded-xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No bills yet. Add bills to generate a priority plan.
              </div>
            ) : (
              priorities.map(({ bucket, score }) => (
                <div
                  key={bucket.key}
                  className="flex items-center justify-between rounded-xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{bucket.name}</div>
                    <div className="text-sm text-zinc-500">
                      Due {bucket.dueDate || "not set"} · {bucket.category || "other"}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-zinc-700">Score {score}</div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
