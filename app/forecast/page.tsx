"use client";

import { useMemo } from "react";
import { useMoneyStore } from "@/lib/money/store";

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function endOfWindow(daysFromNow: number) {
  const d = startOfToday();
  d.setDate(d.getDate() + daysFromNow);
  d.setHours(23, 59, 59, 999);
  return d;
}

function endOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
}

function parseDateSafe(dateISO?: string) {
  if (!dateISO) return null;
  const d = new Date(`${dateISO}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

export default function ForecastPage() {
  const { totals, buckets, debts } = useMoneyStore();

  const today = startOfToday();
  const weekEnd = endOfWindow(6);
  const monthEnd = endOfCurrentMonth();

  const {
    dueThisWeek,
    dueThisMonth,
    later,
    unscheduled,
    dueThisWeekTotal,
    dueThisMonthTotal,
    laterTotal,
    unscheduledTotal,
  } = useMemo(() => {
    const week: typeof buckets = [];
    const month: typeof buckets = [];
    const laterItems: typeof buckets = [];
    const unscheduledItems: typeof buckets = [];

    for (const bucket of buckets) {
      const amount = Number(bucket.target || 0);
      if (!bucket.dueDate) {
        unscheduledItems.push(bucket);
        continue;
      }

      const due = parseDateSafe(bucket.dueDate);
      if (!due) {
        unscheduledItems.push(bucket);
        continue;
      }

      if (due <= weekEnd) {
        week.push(bucket);
      } else if (due <= monthEnd) {
        month.push(bucket);
      } else {
        laterItems.push(bucket);
      }
    }

    const sumTargets = (items: typeof buckets) =>
      items.reduce((sum, b) => sum + Number(b.target || 0), 0);

    return {
      dueThisWeek: week.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
      dueThisMonth: month.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
      later: laterItems.sort((a, b) => (a.dueDate || "").localeCompare(b.dueDate || "")),
      unscheduled: unscheduledItems,
      dueThisWeekTotal: sumTargets(week),
      dueThisMonthTotal: sumTargets(month),
      laterTotal: sumTargets(laterItems),
      unscheduledTotal: sumTargets(unscheduledItems),
    };
  }, [buckets, weekEnd, monthEnd]);

  const availableAfterWeek = totals.income - dueThisWeekTotal;
  const availableAfterMonth = availableAfterWeek - dueThisMonthTotal;
  const availableAfterDebtMinimums = availableAfterMonth - totals.debtMinimums;
  const availableAfterSpending = availableAfterDebtMinimums - totals.spending;

  function SectionCard({
    title,
    subtitle,
    total,
    items,
  }: {
    title: string;
    subtitle: string;
    total: number;
    items: typeof buckets;
  }) {
    return (
      <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
        <div className="flex items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
          </div>
          <div className="text-right">
            <div className="text-xs text-zinc-500">Total</div>
            <div className="text-lg font-black">{formatUSD(total)}</div>
          </div>
        </div>

        <div className="mt-4 grid gap-3">
          {items.length === 0 ? (
            <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
              Nothing here.
            </div>
          ) : (
            items.map((bucket) => (
              <div
                key={bucket.key}
                className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
              >
                <div>
                  <div className="font-semibold">{bucket.name}</div>
                  <div className="text-sm text-zinc-500">
                    {bucket.category || "other"}
                    {bucket.dueDate ? ` · Due ${bucket.dueDate}` : " · No due date"}
                  </div>
                </div>
                <div className="font-semibold">{formatUSD(bucket.target)}</div>
              </div>
            ))
          )}
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Forecast</h1>
            <p className="mt-2 text-zinc-600">
              See what is due this week, this month, and later based on due dates.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(totals.income)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Due this week</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(dueThisWeekTotal)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Due later this month</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(dueThisMonthTotal)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt minimums</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(totals.debtMinimums)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Spending</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(totals.spending)}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After this week</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(availableAfterWeek)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After this month</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(availableAfterMonth)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After debt minimums</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(availableAfterDebtMinimums)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After spending</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(availableAfterSpending)}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Due this week"
            subtitle="Bills due in the next 7 days, including overdue items."
            total={dueThisWeekTotal}
            items={dueThisWeek}
          />

          <SectionCard
            title="Due later this month"
            subtitle="Bills due after this week but before month-end."
            total={dueThisMonthTotal}
            items={dueThisMonth}
          />

          <SectionCard
            title="Later"
            subtitle="Bills due after this month."
            total={laterTotal}
            items={later}
          />

          <SectionCard
            title="No due date set"
            subtitle="These need dates so forecasting can prioritize them correctly."
            total={unscheduledTotal}
            items={unscheduled}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">What this means</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Bills entered</div>
              <div className="mt-1 font-semibold">{buckets.length}</div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Debt accounts entered</div>
              <div className="mt-1 font-semibold">{debts.length}</div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">This week outlook</div>
              <div className="mt-1 font-semibold">
                {availableAfterWeek >= 0
                  ? "You can currently cover this week's due items."
                  : "You are currently short for this week's due items."}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Month outlook</div>
              <div className="mt-1 font-semibold">
                {availableAfterSpending >= 0
                  ? "You still have positive room after current month obligations."
                  : "You are projected short after current month obligations."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
