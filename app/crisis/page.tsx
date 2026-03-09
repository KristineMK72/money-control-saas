"use client";

import { useMemo } from "react";
import { useMoneyStore } from "@/lib/money/store";
import { getPriorityBuckets } from "@/lib/money/priority";

export default function CrisisPage() {
  const { buckets, totals } = useMoneyStore();

  const ranked = useMemo(() => getPriorityBuckets(buckets), [buckets]);
  const top = ranked.slice(0, 3);

  const headline = useMemo(() => {
    if (top.length === 0) {
      return "Add bills to generate a calm financial action plan.";
    }

    const categories = top.map((x) => x.bucket.category).filter(Boolean);

    if (categories.includes("housing")) {
      return "Protect housing first, then utilities and transportation.";
    }

    if (categories.includes("utilities")) {
      return "Protect essential services first, then minimum debt obligations.";
    }

    if (categories.includes("transportation")) {
      return "Protect transportation first so income stays possible.";
    }

    return "Focus on the highest-risk bills first and ignore lower-priority noise today.";
  }, [top]);

  const actions = useMemo(() => {
    if (top.length === 0) {
      return [
        "Add your most urgent bill.",
        "Set due dates for any essential bills.",
        "Come back to see your top priorities."
      ];
    }

    return top.map(({ bucket }) => {
      if (bucket.category === "housing") {
        return `Pay ${bucket.name} first to protect housing stability.`;
      }
      if (bucket.category === "utilities") {
        return `Fund ${bucket.name} to reduce shutoff risk.`;
      }
      if (bucket.category === "transportation") {
        return `Protect ${bucket.name} so transportation stays available.`;
      }
      if (bucket.kind === "credit") {
        return `Make the minimum payment on ${bucket.name} if possible.`;
      }
      return `Put money toward ${bucket.name} next.`;
    });
  }, [top]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <h1 className="text-3xl font-black tracking-tight">Crisis Mode</h1>
        <p className="mt-2 text-zinc-600">
          Calm triage for what matters most right now.
        </p>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <div className="text-sm font-semibold uppercase tracking-wide text-zinc-500">
            Today’s focus
          </div>
          <div className="mt-3 text-2xl font-black tracking-tight">
            {headline}
          </div>
          <div className="mt-4 text-sm text-zinc-600">
            Income logged: ${totals.income.toFixed(2)} · Spending: ${totals.spending.toFixed(2)} · Payments: ${totals.payments.toFixed(2)}
          </div>
        </div>

        <div className="mt-8 grid gap-4 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Top 3 actions now</h2>
            <div className="mt-4 grid gap-3">
              {actions.map((action, i) => (
                <div key={i} className="rounded-2xl bg-zinc-50 p-4">
                  <div className="text-xs font-semibold text-zinc-500">
                    Action {i + 1}
                  </div>
                  <div className="mt-1 font-semibold">{action}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Priority funding</h2>
            <div className="mt-4 grid gap-3">
              {top.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  No priority bills yet.
                </div>
              ) : (
                top.map(({ bucket, score }) => (
                  <div
                    key={bucket.key}
                    className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                  >
                    <div>
                      <div className="font-semibold">{bucket.name}</div>
                      <div className="text-sm text-zinc-500">
                        ${bucket.target.toFixed(2)} · Due {bucket.dueDate || "not set"}
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
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">72-hour stabilization plan</h2>
          <div className="mt-4 grid gap-3 md:grid-cols-3">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">Today</div>
              <div className="mt-1 font-semibold">
                Fund the highest-risk essential bill first.
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">Next 24 hours</div>
              <div className="mt-1 font-semibold">
                Protect utilities, transportation, or minimum obligations.
              </div>
            </div>
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-xs font-semibold text-zinc-500">This week</div>
              <div className="mt-1 font-semibold">
                Pause non-essential spending and reduce leak categories.
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
