"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  DarkPanel,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  primaryButtonClass,
} from "@/components/AppFrame";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BillRow = {
  id: string;
  name: string;
  target: number | null;
  monthly_target: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
  category?: string | null;
};

type DebtRow = {
  id: string;
  name: string;
  balance: number | null;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  due_day: number | null;
  is_monthly: boolean | null;
};

type CalendarItem = {
  id: string;
  name: string;
  amount: number;
  date: Date;
  type: "bill" | "debt";
};

type WeekSummary = {
  weekNumber: number;
  label: string;
  start: Date;
  end: Date;
  total: number;
  items: CalendarItem[];
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function iso(date: Date) {
  return date.toISOString().slice(0, 10);
}

function safeDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
}

function obligationDate(
  dueDate: string | null,
  dueDay: number | null,
  year: number,
  month: number
) {
  if (dueDate) {
    const parsed = new Date(`${dueDate}T00:00:00`);
    if (parsed.getFullYear() === year && parsed.getMonth() === month) {
      return parsed;
    }
  }

  if (dueDay) return safeDate(year, month, dueDay);
  return null;
}

function sameOrBefore(a: Date, b: Date) {
  return a.getTime() <= b.getTime();
}

function sameOrAfter(a: Date, b: Date) {
  return a.getTime() >= b.getTime();
}

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const now = new Date();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

  useEffect(() => {
    async function loadData() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setMessage("Sign in to build your weekly money map.");
        setLoading(false);
        return;
      }

      const [billsRes, debtsRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
      ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      if (debtsRes.error) setMessage(debtsRes.error.message);

      setBills((billsRes.data || []) as BillRow[]);
      setDebts((debtsRes.data || []) as DebtRow[]);
      setLoading(false);
    }

    void loadData();
  }, [supabase, viewYear, viewMonth]);

  const items = useMemo(() => {
    const billItems: CalendarItem[] = bills
      .map((bill) => {
        const date = obligationDate(
          bill.due_date,
          bill.due_day,
          viewYear,
          viewMonth
        );
        if (!date) return null;
        return {
          id: `bill-${bill.id}`,
          name: bill.name,
          amount: Number(bill.monthly_target || bill.target || 0),
          date,
          type: "bill" as const,
        };
      })
      .filter(Boolean) as CalendarItem[];

    const debtItems: CalendarItem[] = debts
      .map((debt) => {
        const date = obligationDate(
          debt.due_date,
          debt.due_day,
          viewYear,
          viewMonth
        );
        if (!date) return null;
        return {
          id: `debt-${debt.id}`,
          name: debt.name,
          amount: Number(debt.monthly_min_payment || debt.min_payment || 0),
          date,
          type: "debt" as const,
        };
      })
      .filter(Boolean) as CalendarItem[];

    return [...billItems, ...debtItems]
      .filter((item) => item.amount > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bills, debts, viewMonth, viewYear]);

  const weekSummaries = useMemo<WeekSummary[]>(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last = new Date(viewYear, viewMonth + 1, 0);
    const weeks: WeekSummary[] = [];
    let start = new Date(first);
    let weekNumber = 1;

    while (sameOrBefore(start, last)) {
      const end = new Date(start);
      end.setDate(start.getDate() + 6);
      if (end > last) end.setTime(last.getTime());

      const weekItems = items.filter(
        (item) => sameOrAfter(item.date, start) && sameOrBefore(item.date, end)
      );

      weeks.push({
        weekNumber,
        label: `Week ${weekNumber}`,
        start: new Date(start),
        end: new Date(end),
        total: weekItems.reduce((sum, item) => sum + item.amount, 0),
        items: weekItems,
      });

      start.setDate(start.getDate() + 7);
      weekNumber += 1;
    }

    return weeks;
  }, [items, viewMonth, viewYear]);

  const monthTotal = items.reduce((sum, item) => sum + item.amount, 0);
  const heaviestWeek = [...weekSummaries].sort((a, b) => b.total - a.total)[0];
  const monthLabel = new Date(viewYear, viewMonth).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: monthLabel,
    totalNeeded: monthTotal,
    incomeSoFar: 0,
    incomeGap: monthTotal,
    dailyIncomeNeeded: Math.ceil(monthTotal / 30),
  });

  function shiftMonth(delta: number) {
    const next = new Date(viewYear, viewMonth + delta, 1);
    setViewYear(next.getFullYear());
    setViewMonth(next.getMonth());
  }

  if (loading) {
    return (
      <AppShell>
        <Panel>Loading calendar...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <PageHeader
        eyebrow="AskBen Calendar"
        title="Calendar"
        subtitle="A weekly map of bills and minimums, because surprise due dates are rude."
        action={
          <div className="flex items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className={primaryButtonClass}>
              Prev
            </button>
            <button onClick={() => shiftMonth(1)} className={primaryButtonClass}>
              Next
            </button>
          </div>
        }
      />

      {message && <Notice>{message}</Notice>}

      <DarkPanel>
        <BenBubble message={benInsight.text} mood={benInsight.mood} />
      </DarkPanel>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Month" value={monthLabel} tone="sky" />
        <MetricCard label="Total due" value={money(monthTotal)} tone="amber" />
        <MetricCard
          label="Heaviest week"
          value={heaviestWeek ? money(heaviestWeek.total) : "$0.00"}
          helper={heaviestWeek?.label || "No obligations"}
          tone={heaviestWeek?.total ? "rose" : "zinc"}
        />
      </section>

      <Panel>
        <h2 className="text-2xl font-black">Weekly Income Targets</h2>
        <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {weekSummaries.map((week) => {
            const open = expandedWeeks[week.weekNumber] ?? week.total > 0;

            return (
              <div
                key={week.weekNumber}
                className="rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <button
                  onClick={() =>
                    setExpandedWeeks((prev) => ({
                      ...prev,
                      [week.weekNumber]: !open,
                    }))
                  }
                  className="w-full text-left"
                >
                  <p className="text-xs font-black uppercase tracking-[0.18em] text-zinc-500">
                    {week.label}
                  </p>
                  <p className="mt-1 text-sm font-semibold text-zinc-600">
                    {iso(week.start)} to {iso(week.end)}
                  </p>
                  <p className="mt-4 text-3xl font-black text-zinc-950">
                    {money(week.total)}
                  </p>
                </button>

                {open && (
                  <div className="mt-4 space-y-2">
                    {week.items.length === 0 ? (
                      <p className="text-sm font-semibold text-zinc-500">
                        No due items. Enjoy the quiet.
                      </p>
                    ) : (
                      week.items.map((item) => (
                        <div
                          key={item.id}
                          className="rounded-xl border border-white bg-white p-3"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <p className="font-black">{item.name}</p>
                              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                {item.type} - {iso(item.date)}
                              </p>
                            </div>
                            <p className="font-black">{money(item.amount)}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Panel>
    </AppShell>
  );
}
