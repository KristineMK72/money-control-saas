"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  category:
    | "housing"
    | "utilities"
    | "transportation"
    | "debt"
    | "food"
    | "other"
    | null;
  target: number | null;
  due_date: string | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
};

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number | null;
  min_payment: number | null;
  due_date: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
};

type CalendarItem = {
  id: string;
  source: "bill" | "debt";
  name: string;
  category: string | null;
  amount: number;
  dueDate: string;
};

type WeekSummary = {
  weekNumber: number;
  label: string;
  startISO: string;
  endISO: string;
  total: number;
  bills: number;
  debts: number;
  items: CalendarItem[];
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const shellCard =
  "rounded-[32px] border border-zinc-300 bg-white/96 p-5 text-zinc-950 shadow-2xl backdrop-blur md:p-8";

const card =
  "rounded-3xl border border-zinc-300 bg-white/96 p-5 text-zinc-950 shadow-xl backdrop-blur";

const darkPanel =
  "rounded-3xl border border-zinc-700 bg-zinc-950/90 p-5 text-white shadow-xl backdrop-blur";

const navButton =
  "rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-black text-zinc-950 shadow-sm hover:bg-zinc-100";

function num(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function isoFromYMD(year: number, monthIndex: number, day: number) {
  const d = new Date(year, monthIndex, day, 12, 0, 0, 0);
  return d.toISOString().slice(0, 10);
}

function clampDay(year: number, monthIndex: number, day: number) {
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  return Math.min(Math.max(day, 1), lastDay);
}

function getMonthName(year: number, monthIndex: number) {
  return new Date(year, monthIndex, 1).toLocaleString("en-US", {
    month: "long",
    year: "numeric",
  });
}

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function prettyDate(iso: string) {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function categoryTone(category?: string | null) {
  switch (category) {
    case "housing":
      return "border-red-300 bg-red-100 text-red-950";
    case "utilities":
      return "border-amber-300 bg-amber-100 text-amber-950";
    case "transportation":
      return "border-blue-300 bg-blue-100 text-blue-950";
    case "food":
      return "border-emerald-300 bg-emerald-100 text-emerald-950";
    case "credit":
      return "border-purple-300 bg-purple-100 text-purple-950";
    case "loan":
      return "border-indigo-300 bg-indigo-100 text-indigo-950";
    default:
      return "border-zinc-300 bg-zinc-100 text-zinc-950";
  }
}

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    let mounted = true;

    async function loadCalendarData() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        setMessage("Please log in to see your calendar.");
        setLoading(false);
        return;
      }

      const [billsRes, debtsRes] = await Promise.all([
        supabase
          .from("bills")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("debts")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

      if (!mounted) return;

      if (billsRes.error) {
        setMessage(billsRes.error.message);
      } else {
        setBills((billsRes.data || []) as BillRow[]);
      }

      if (debtsRes.error) {
        setMessage((prev) => prev || debtsRes.error.message);
      } else {
        setDebts((debtsRes.data || []) as DebtRow[]);
      }

      setLoading(false);
    }

    void loadCalendarData();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    for (const bill of bills) {
      let dueDate: string | null = null;

      if (bill.due_date) {
        const parsed = new Date(`${bill.due_date}T12:00:00`);
        if (parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth) {
          dueDate = bill.due_date;
        }
      } else if (bill.is_monthly && bill.due_day) {
        dueDate = isoFromYMD(
          viewYear,
          viewMonth,
          clampDay(viewYear, viewMonth, bill.due_day)
        );
      }

      if (!dueDate) continue;

      items.push({
        id: `bill-${bill.id}`,
        source: "bill",
        name: bill.name,
        category: bill.category,
        amount: num(bill.monthly_target ?? bill.target),
        dueDate,
      });
    }

    for (const debt of debts) {
      let dueDate: string | null = null;

      if (debt.due_date) {
        const parsed = new Date(`${debt.due_date}T12:00:00`);
        if (parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth) {
          dueDate = debt.due_date;
        }
      } else if (debt.is_monthly && debt.due_day) {
        dueDate = isoFromYMD(
          viewYear,
          viewMonth,
          clampDay(viewYear, viewMonth, debt.due_day)
        );
      }

      if (!dueDate) continue;

      items.push({
        id: `debt-${debt.id}`,
        source: "debt",
        name: debt.name,
        category: debt.kind,
        amount: num(debt.monthly_min_payment ?? debt.min_payment),
        dueDate,
      });
    }

    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, debts, viewYear, viewMonth]);

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};

    for (const item of calendarItems) {
      if (!grouped[item.dueDate]) grouped[item.dueDate] = [];
      grouped[item.dueDate].push(item);
    }

    return grouped;
  }, [calendarItems]);

  const monthSummary = useMemo(() => {
    return calendarItems.reduce(
      (acc, item) => {
        acc.total += item.amount;
        if (item.source === "bill") acc.bills += item.amount;
        if (item.source === "debt") acc.debts += item.amount;
        return acc;
      },
      { total: 0, bills: 0, debts: 0 }
    );
  }, [calendarItems]);

  const daysGrid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);

    const cells: Array<{
      iso: string | null;
      dayNumber: number | null;
      isCurrentMonth: boolean;
      weekNumber: number;
    }> = [];

    let weekNumber = 1;

    for (let i = 0; i < firstOfMonth.getDay(); i++) {
      cells.push({
        iso: null,
        dayNumber: null,
        isCurrentMonth: false,
        weekNumber,
      });
    }

    for (let day = 1; day <= lastOfMonth.getDate(); day++) {
      const currentDate = new Date(viewYear, viewMonth, day);

      if (day !== 1 && currentDate.getDay() === 0) {
        weekNumber += 1;
      }

      cells.push({
        iso: isoFromYMD(viewYear, viewMonth, day),
        dayNumber: day,
        isCurrentMonth: true,
        weekNumber,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        iso: null,
        dayNumber: null,
        isCurrentMonth: false,
        weekNumber,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

  const weekSummaries = useMemo(() => {
    const weeks: Record<number, WeekSummary> = {};

    for (const cell of daysGrid) {
      if (!cell.iso || !cell.dayNumber) continue;

      const week = cell.weekNumber;

      if (!weeks[week]) {
        weeks[week] = {
          weekNumber: week,
          label: `Week ${week}`,
          startISO: cell.iso,
          endISO: cell.iso,
          total: 0,
          bills: 0,
          debts: 0,
          items: [],
        };
      }

      weeks[week].endISO = cell.iso;

      const dayItems = itemsByDate[cell.iso] || [];

      for (const item of dayItems) {
        weeks[week].items.push(item);
        weeks[week].total += item.amount;

        if (item.source === "bill") weeks[week].bills += item.amount;
        if (item.source === "debt") weeks[week].debts += item.amount;
      }
    }

    return Object.values(weeks);
  }, [daysGrid, itemsByDate]);

  function goPrevMonth() {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear((y) => y - 1);
    } else {
      setViewMonth((m) => m - 1);
    }
  }

  function goNextMonth() {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear((y) => y + 1);
    } else {
      setViewMonth((m) => m + 1);
    }
  }

  return (
    <main className="min-h-screen bg-transparent p-4 text-zinc-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <section className={shellCard}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400 bg-emerald-100 px-4 py-2 text-xs font-black uppercase tracking-[0.2em] text-emerald-950">
                Due dates
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950">
                Calendar
              </h1>

              <p className="mt-3 max-w-2xl text-base font-semibold text-zinc-700 md:text-lg">
                See what is due this month, what week it lands in, and how much
                income each week needs to cover.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/dashboard" className={navButton}>
                Dashboard
              </a>
              <a href="/bills" className={navButton}>
                Bills
              </a>
              <a href="/debt" className={navButton}>
                Credit & Loans
              </a>
              <a href="/forecast" className={navButton}>
                Forecast
              </a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-amber-400 bg-amber-100 p-4 text-sm font-bold text-amber-950">
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SummaryCard
              label="Total due this month"
              value={formatUSD(monthSummary.total)}
            />
            <SummaryCard
              label="Bills this month"
              value={formatUSD(monthSummary.bills)}
            />
            <SummaryCard
              label="Debt minimums this month"
              value={formatUSD(monthSummary.debts)}
            />
          </div>

          <section className={`${darkPanel} mt-8`}>
            <div className="flex flex-col gap-2 md:flex-row md:items-end md:justify-between">
              <div>
                <p className="text-xs font-black uppercase tracking-[0.2em] text-emerald-300">
                  Weekly breakdown
                </p>
                <h2 className="mt-2 text-2xl font-black text-white">
                  What needs to be covered each week
                </h2>
              </div>

              <p className="text-sm font-semibold text-zinc-300">
                Based on due dates in {getMonthName(viewYear, viewMonth)}
              </p>
            </div>

            <div className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
              {weekSummaries.map((week) => (
                <div
                  key={week.weekNumber}
                  className="rounded-2xl border border-white/10 bg-white/10 p-4"
                >
                  <p className="text-sm font-bold text-zinc-300">
                    {week.label}
                  </p>

                  <p className="mt-1 text-xs font-semibold text-zinc-400">
                    {prettyDate(week.startISO)} – {prettyDate(week.endISO)}
                  </p>

                  <p className="mt-3 text-3xl font-black text-white">
                    {formatUSD(week.total)}
                  </p>

                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs font-bold">
                    <div className="rounded-xl bg-white/10 p-2">
                      <p className="text-zinc-400">Bills</p>
                      <p className="text-white">{formatUSD(week.bills)}</p>
                    </div>

                    <div className="rounded-xl bg-white/10 p-2">
                      <p className="text-zinc-400">Debt</p>
                      <p className="text-white">{formatUSD(week.debts)}</p>
                    </div>
                  </div>

                  <p className="mt-3 text-xs font-semibold text-zinc-400">
                    {week.items.length === 0
                      ? "Nothing due this week."
                      : `${week.items.length} item${
                          week.items.length === 1 ? "" : "s"
                        } due.`}
                  </p>
                </div>
              ))}
            </div>
          </section>

          <div className="mt-8 rounded-3xl border border-zinc-300 bg-white/98 p-4 text-zinc-950 shadow-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button onClick={goPrevMonth} className={navButton}>
                ← Prev
              </button>

              <h2 className="text-center text-xl font-black md:text-2xl">
                {getMonthName(viewYear, viewMonth)}
              </h2>

              <button onClick={goNextMonth} className={navButton}>
                Next →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="rounded-xl bg-zinc-200 px-2 py-3 text-center text-xs font-black uppercase tracking-wide text-zinc-700 md:text-sm"
                >
                  {day}
                </div>
              ))}

              {daysGrid.map((cell, idx) => {
                const isToday = cell.iso === todayISO();
                const items = cell.iso ? itemsByDate[cell.iso] || [] : [];
                const dayTotal = items.reduce((sum, item) => sum + item.amount, 0);

                return (
                  <div
                    key={`${cell.iso || "empty"}-${idx}`}
                    className={`min-h-[125px] rounded-2xl border p-2 md:min-h-[160px] md:p-3 ${
                      cell.isCurrentMonth
                        ? isToday
                          ? "border-emerald-500 bg-emerald-100"
                          : "border-zinc-300 bg-white"
                        : "border-zinc-100 bg-zinc-100/70"
                    }`}
                  >
                    {cell.dayNumber ? (
                      <>
                        <div className="mb-2 flex items-center justify-between gap-2">
                          <span className="text-sm font-black text-zinc-800">
                            {cell.dayNumber}
                          </span>

                          {dayTotal > 0 ? (
                            <span className="rounded-full bg-zinc-950 px-2 py-1 text-[10px] font-black text-white">
                              {formatUSD(dayTotal)}
                            </span>
                          ) : null}
                        </div>

                        <div className="space-y-2">
                          {items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-xl border px-2 py-2 text-[11px] font-bold leading-4 md:text-xs ${categoryTone(
                                item.category
                              )}`}
                            >
                              <div className="truncate">{item.name}</div>
                              <div>{formatUSD(item.amount)}</div>
                            </div>
                          ))}

                          {items.length > 3 ? (
                            <div className="text-[11px] font-black text-zinc-600 md:text-xs">
                              +{items.length - 3} more
                            </div>
                          ) : null}
                        </div>
                      </>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className={`${card} mt-8`}>
            <h2 className="text-2xl font-black">This month’s due list</h2>

            <div className="mt-5 grid gap-3">
              {loading ? (
                <div className="rounded-2xl bg-zinc-100 p-4 text-sm font-semibold text-zinc-600">
                  Loading calendar...
                </div>
              ) : calendarItems.length === 0 ? (
                <div className="rounded-2xl bg-zinc-100 p-4 text-sm font-semibold text-zinc-600">
                  No bills or debt minimums found for this month.
                </div>
              ) : (
                calendarItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
                  >
                    <div>
                      <div className="font-black text-zinc-950">{item.name}</div>
                      <div className="text-sm font-semibold text-zinc-600">
                        {prettyDate(item.dueDate)} ·{" "}
                        {item.category || item.source}
                      </div>
                    </div>

                    <div className="text-right text-lg font-black text-zinc-950">
                      {formatUSD(item.amount)}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={card}>
      <div className="text-sm font-bold text-zinc-600">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
