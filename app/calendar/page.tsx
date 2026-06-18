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
import ScrollRevealCard from "@/components/ScrollRevealCard";
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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function safeDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
}

function obligationDate(
  dueDate: string | null,
  dueDay: number | null,
  isMonthly: boolean | null,
  year: number,
  month: number
) {
  const parsed = dueDate ? new Date(`${dueDate}T00:00:00`) : null;

  if (dueDay) {
    return safeDate(year, month, dueDay);
  }

  if (parsed && isMonthly) {
    return safeDate(year, month, parsed.getDate());
  }

  if (
    parsed &&
    parsed.getFullYear() === year &&
    parsed.getMonth() === month
  ) {
    return parsed;
  }

  return null;
}

function sameOrBefore(a: Date, b: Date) {
  return a.getTime() <= b.getTime();
}

function sameOrAfter(a: Date, b: Date) {
  return a.getTime() >= b.getTime();
}

function dayName(date: Date) {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>(
    {}
  );

  const now = new Date();
  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

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
  }, [supabase]);

  const items = useMemo(() => {
    const billItems: CalendarItem[] = bills
      .map((bill) => {
        const date = obligationDate(
          bill.due_date,
          bill.due_day,
          bill.is_monthly,
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
          debt.is_monthly,
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

  const calendarCells = useMemo(() => {
    const firstDay = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = firstDay.getDay();

    return Array.from({ length: startOffset + daysInMonth }, (_, index) => {
      const dayNumber = index - startOffset + 1;

      if (dayNumber <= 0) return null;

      const date = new Date(viewYear, viewMonth, dayNumber);
      const dayItems = items.filter((item) => iso(item.date) === iso(date));
      const total = dayItems.reduce((sum, item) => sum + item.amount, 0);

      return {
        dayNumber,
        date,
        items: dayItems,
        total,
      };
    });
  }, [items, viewMonth, viewYear]);

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

  const heaviestWeek = [...weekSummaries].sort(
    (a, b) => b.total - a.total
  )[0];

  const monthLabel = viewDate.toLocaleString("en-US", {
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

  const calendarMood =
    monthTotal > 0 ? "/ben-mastermind.png" : "/ben-thinking.png";

  const heavyMood =
    heaviestWeek && heaviestWeek.total > 0
      ? "/ben-overdraft.png"
      : "/ben-recovery.png";

  function shiftMonth(delta: number) {
    setViewDate((current) => {
      const next = new Date(
        current.getFullYear(),
        current.getMonth() + delta,
        1
      );
      return next;
    });
    setExpandedWeeks({});
  }

  function goToCurrentMonth() {
    const today = new Date();
    setViewDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setExpandedWeeks({});
  }

  function changeMonth(month: number) {
    setViewDate((current) => new Date(current.getFullYear(), month, 1));
    setExpandedWeeks({});
  }

  function changeYear(year: number) {
    setViewDate((current) => new Date(year, current.getMonth(), 1));
    setExpandedWeeks({});
  }

  const yearChoices = Array.from(
    { length: 7 },
    (_, index) => now.getFullYear() - 3 + index
  );

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
          <div className="flex flex-wrap items-center gap-2">
            <button onClick={() => shiftMonth(-1)} className={primaryButtonClass}>
              Prev
            </button>

            <button onClick={goToCurrentMonth} className={primaryButtonClass}>
              This Month
            </button>

            <button onClick={() => shiftMonth(1)} className={primaryButtonClass}>
              Next
            </button>
          </div>
        }
      />

      {message && <Notice>{message}</Notice>}

      <ScrollRevealCard
        title="Calendar Briefing"
        subtitle={`${monthLabel} obligations and weekly pressure`}
        image={calendarMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Month" value={monthLabel} tone="sky" />
          <MetricCard label="Total due" value={money(monthTotal)} tone="amber" />
          <MetricCard
            label="Heaviest week"
            value={heaviestWeek ? money(heaviestWeek.total) : "$0.00"}
            helper={heaviestWeek?.label || "No obligations"}
            tone={heaviestWeek?.total ? "rose" : "zinc"}
          />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Monthly Money Map"
        subtitle="Bills and debts laid out by day"
        image="/ben-mastermind.png"
        defaultOpen
      >
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.2em] text-zinc-500">
              Monthly View
            </p>
            <h2 className="mt-1 text-2xl font-black text-zinc-950">
              {monthLabel}
            </h2>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <select
              value={viewMonth}
              onChange={(e) => changeMonth(Number(e.target.value))}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-black text-zinc-950"
            >
              {Array.from({ length: 12 }, (_, month) => (
                <option key={month} value={month}>
                  {new Date(2026, month, 1).toLocaleString("en-US", {
                    month: "long",
                  })}
                </option>
              ))}
            </select>

            <select
              value={viewYear}
              onChange={(e) => changeYear(Number(e.target.value))}
              className="rounded-xl border border-zinc-300 bg-white px-3 py-2 text-sm font-black text-zinc-950"
            >
              {yearChoices.map((year) => (
                <option key={year} value={year}>
                  {year}
                </option>
              ))}
            </select>

            <button onClick={goToCurrentMonth} className={primaryButtonClass}>
              This Month
            </button>
          </div>
        </div>

        <div className="mt-5 grid grid-cols-7 gap-2 text-center text-xs font-black uppercase tracking-wide text-zinc-500">
          {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((day) => (
            <div key={day}>{day}</div>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-7 gap-2">
          {calendarCells.map((cell, index) => {
            if (!cell) {
              return <div key={`blank-${index}`} className="min-h-[96px]" />;
            }

            const isToday =
              cell.date.getFullYear() === now.getFullYear() &&
              cell.date.getMonth() === now.getMonth() &&
              cell.date.getDate() === now.getDate();

            return (
              <div
                key={iso(cell.date)}
                className={`min-h-[96px] rounded-2xl border p-2 text-left ${
                  isToday
                    ? "border-amber-300 bg-amber-50"
                    : "border-zinc-200 bg-zinc-50"
                }`}
              >
                <div className="flex items-center justify-between gap-2">
                  <div>
                    <p className="text-sm font-black text-zinc-950">
                      {cell.dayNumber}
                    </p>
                    <p className="text-[10px] font-bold uppercase text-zinc-400 md:hidden">
                      {dayName(cell.date)}
                    </p>
                  </div>

                  {cell.total > 0 && (
                    <p className="rounded-full bg-zinc-950 px-2 py-0.5 text-[10px] font-black text-white">
                      {money(cell.total)}
                    </p>
                  )}
                </div>

                <div className="mt-2 space-y-1">
                  {cell.items.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className={`truncate rounded-lg px-2 py-1 text-[11px] font-black ${
                        item.type === "bill"
                          ? "bg-sky-100 text-sky-800"
                          : "bg-rose-100 text-rose-800"
                      }`}
                      title={`${item.name} - ${money(item.amount)}`}
                    >
                      {item.name}
                    </div>
                  ))}

                  {cell.items.length > 3 && (
                    <p className="text-[11px] font-bold text-zinc-500">
                      +{cell.items.length - 3} more
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Weekly Income Targets"
        subtitle="Each week shows how much needs to be covered"
        image={heavyMood}
        defaultOpen
      >
        <h2 className="text-2xl font-black text-zinc-950">
          Weekly Income Targets
        </h2>

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
                              <p className="font-black text-zinc-950">
                                {item.name}
                              </p>

                              <p className="text-xs font-bold uppercase tracking-wide text-zinc-500">
                                {item.type} - {iso(item.date)}
                              </p>
                            </div>

                            <p className="font-black text-zinc-950">
                              {money(item.amount)}
                            </p>
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
      </ScrollRevealCard>
    </AppShell>
  );
}
