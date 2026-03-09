"use client";

import { useMoneyStore } from "@/lib/money/store";

export default function ForecastPage() {
  const { totals, buckets, debts } = useMoneyStore();

  const billsTotal = buckets.reduce((sum, b) => sum + b.target, 0);
  const availableAfterBills = totals.income - billsTotal;
  const availableAfterDebtMinimums = availableAfterBills - totals.debtMinimums;
  const availableAfterSpending = availableAfterDebtMinimums - totals.spending;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Forecast</h1>
            <p className="mt-2 text-zinc-600">
              See what your money looks like after bills, debt minimums, and spending.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income</div>
            <div className="mt-2 text-3xl font-black">${totals.income.toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Bills total</div>
            <div className="mt-2 text-3xl font-black">${billsTotal.toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt minimums</div>
            <div className="mt-2 text-3xl font-black">${totals.debtMinimums.toFixed(2)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Spending</div>
            <div className="mt-2 text-3xl font-black">${totals.spending.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After bills</div>
            <div className="mt-2 text-3xl font-black">
              ${availableAfterBills.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After debt minimums</div>
            <div className="mt-2 text-3xl font-black">
              ${availableAfterDebtMinimums.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After spending</div>
            <div className="mt-2 text-3xl font-black">
              ${availableAfterSpending.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">What this means</h2>
          <div className="mt-4 grid gap-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Bills entered</div>
              <div className="mt-1 font-semibold">{buckets.length}</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Debt accounts entered</div>
              <div className="mt-1 font-semibold">{debts.length}</div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Current forecast</div>
              <div className="mt-1 font-semibold">
                {availableAfterSpending >= 0
                  ? "You still have positive room after current entries."
                  : "You are projected short based on current entries."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
