"use client";

import { useMoneyStore } from "@/lib/money/store";
import { getPriorityBuckets } from "@/lib/money/priority";

export default function DashboardPage() {
  const { buckets, totals } = useMoneyStore();
  const priorities = getPriorityBuckets(buckets).slice(0, 3);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Dashboard</h1>
            <p className="mt-2 text-zinc-600">
              Calm overview of what matters most right now.
            </p>
          </div>
        </div>

        <div className="mt-4 flex flex-wrap gap-3">
          <a
            href="/bills"
            className="rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
          >
            Add Bills
          </a>

          <a
            href="/crisis"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Crisis Mode
          </a>

          <a
            href="/signup"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Account
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.income.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Spending</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.spending.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Payments</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.payments.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-lg font-bold">Pay these first</h2>
            <a
              href="/bills"
              className="text-sm font-semibold text-zinc-700 hover:text-black"
            >
              Manage bills
            </a>
          </div>

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
                      ${bucket.target.toFixed(2)} · Due{" "}
                      {bucket.dueDate || "not set"} ·{" "}
                      {bucket.category || "other"}
                    </div>
                  </div>
                  <div className="text-sm font-bold text-zinc-700">
                    Score {score}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">How this works</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Add your bills, set due dates, and let the app rank what matters
              most first. Housing, utilities, and transportation rise to the top
              faster because they affect real-life stability.
            </p>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-bold">Next step</h2>
            <p className="mt-3 text-sm leading-6 text-zinc-600">
              Start by adding your most urgent real bill. Then open Crisis Mode
              to get a simple 72-hour stabilization plan.
            </p>

            <div className="mt-4">
              <a
                href="/bills"
               
