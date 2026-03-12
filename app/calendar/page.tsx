"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BillRow = {
  id: string;
  name: string;
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;
  target: number;
  due_date: string | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
};

type DebtRow = {
  id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
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

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatUSD(n: number) {
  return `$${Number(n || 0).toFixed(2)}`;
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

function categoryTone(category?: string | null) {
  switch (category) {
    case "housing":
      return "bg-red-50 text-red-700";
    case "utilities":
      return "bg-amber-50 text-amber-700";
    case "transportation":
      return "bg-blue-50 text-blue-700";
    case "credit":
      return "bg-purple-50 text-purple-700";
    case "loan":
      return "bg-indigo-50 text-indigo-700";
    default:
      return "bg-zinc-100 text-zinc-700";
  }
}

export default function CalendarPage() {
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());

  useEffect(() => {
    async function loadCalendarData() {
      setLoading(true);
      setMessage("");

      const { data, error } = await supabase.auth.getSession();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const session = data.session;
      if (!session?.user) {
        setMessage("Please log in to view your calendar.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const [billsRes, debtsRes] = await Promise.all([
        supabase.from("bills").select("*").order("created_at", { ascending: false }),
        supabase.from("debts").select("*").order("created_at", { ascending: false }),
      ]);

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

    loadCalendarData();
  }, []);

  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];

    for (const bill of bills) {
      let dueDate: string | null = null;

      if (bill.due_date) {
        const parsed = new Date(`${bill.due_date}T12:00:00`);
        if (
          parsed.getFullYear() === viewYear &&
          parsed.getMonth() === viewMonth
        ) {
          dueDate = bill.due_date;
        }
      } else if (bill.is_monthly && bill.due_day) {
        const safeDay = clampDay(viewYear, viewMonth, bill.due_day);
        dueDate = isoFromYMD(viewYear, viewMonth, safeDay);
      }

      if (!dueDate) continue;

      items.push({
        id: `bill-${bill.id}`,
        source: "bill",
        name: bill.name,
        category: bill.category,
        amount: Number(bill.monthly_target || bill.target || 0),
        dueDate,
      });
    }

    for (const debt of debts) {
      let dueDate: string | null = null;

      if (debt.due_date) {
        const parsed = new Date(`${debt.due_date}T12:00:00`);
        if (
          parsed.getFullYear() === viewYear &&
          parsed.getMonth() === viewMonth
        ) {
          dueDate = debt.due_date;
        }
      } else if (debt.is_monthly && debt.due_day) {
        const safeDay = clampDay(viewYear, viewMonth, debt.due_day);
        dueDate = isoFromYMD(viewYear, viewMonth, safeDay);
      }

      if (!dueDate) continue;

      items.push({
        id: `debt-${debt.id}`,
        source: "debt",
        name: debt.name,
        category: debt.kind,
        amount: Number(debt.monthly_min_payment || debt.min_payment || 0),
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

    const firstWeekday = firstOfMonth.getDay();
    const daysInMonth = lastOfMonth.getDate();

    const cells: Array<{
      iso: string | null;
      dayNumber: number | null;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < firstWeekday; i++) {
      cells.push({
        iso: null,
        dayNumber: null,
        isCurrentMonth: false,
      });
    }

    for (let day = 1; day <= daysInMonth; day++) {
      cells.push({
        iso: isoFromYMD(viewYear, viewMonth, day),
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({
        iso: null,
        dayNumber: null,
        isCurrentMonth: false,
      });
    }

    return cells;
  }, [viewYear, viewMonth]);

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
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-5 shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Due dates
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Calendar
              </h1>

              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                See bills and debt due dates in one monthly calendar view.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Dashboard
              </a>
              <a
                href="/bills"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Bills
              </a>
              <a
                href="/debt"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Credit & Loans
              </a>
              <a
                href="/forecast"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Forecast
              </a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {!userId && !loading ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="font-semibold text-white">You are not logged in.</div>
              <p className="mt-2 text-sm text-zinc-300">
                Go to signup/login first, then come back here.
              </p>
              <div className="mt-4">
                <a
                  href="/signup?mode=login"
                  className="inline-flex rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Go to Login
                </a>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Total due this month</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                {formatUSD(monthSummary.total)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Bills this month</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                {formatUSD(monthSummary.bills)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Debt minimums this month</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                {formatUSD(monthSummary.debts)}
              </div>
            </div>
          </div>

          <div className="mt-8 rounded-3xl border border-white/10 bg-white p-4 text-zinc-950 shadow-sm md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button
                onClick={goPrevMonth}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
              >
                ← Prev
              </button>

              <h2 className="text-xl font-black text-center">
                {getMonthName(viewYear, viewMonth)}
              </h2>

              <button
                onClick={goNextMonth}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
              >
                Next →
              </button>
            </div>

            <div className="grid grid-cols-7 gap-2">
              {WEEKDAYS.map((day) => (
                <div
                  key={day}
                  className="rounded-xl bg-zinc-100 px-2 py-3 text-center text-xs font-bold uppercase tracking-wide text-zinc-600 md:text-sm"
                >
                  {day}
                </div>
              ))}

              {daysGrid.map((cell, idx) => {
                const isToday = cell.iso === todayISO();
                const items = cell.iso ? itemsByDate[cell.iso] || [] : [];

                return (
                  <div
                    key={`${cell.iso || "empty"}-${idx}`}
                    className={`min-h-[120px] rounded-2xl border p-2 md:min-h-[150px] md:p-3 ${
                      cell.isCurrentMonth
                        ? isToday
                          ? "border-emerald-300 bg-emerald-50"
                          : "border-zinc-200 bg-white"
                        : "border-transparent bg-zinc-50"
                    }`}
                  >
                    {cell.dayNumber ? (
                      <>
                        <div className="mb-2 text-sm font-bold text-zinc-700">
                          {cell.dayNumber}
                        </div>

                        <div className="space-y-2">
                          {items.slice(0, 3).map((item) => (
                            <div
                              key={item.id}
                              className={`rounded-xl px-2 py-2 text-[11px] leading-4 md:text-xs ${categoryTone(
                                item.category
                              )}`}
                            >
                              <div className="font-bold">{item.name}</div>
                              <div>{formatUSD(item.amount)}</div>
                            </div>
                          ))}

                          {items.length > 3 ? (
                            <div className="text-[11px] font-semibold text-zinc-500 md:text-xs">
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

          <div className="mt-8 rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
            <h2 className="text-2xl font-black">This month’s due list</h2>
            <div className="mt-5 grid gap-3">
              {loading ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  Loading calendar...
                </div>
              ) : calendarItems.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  No bills or debt minimums found for this month.
                </div>
              ) : (
                calendarItems.map((item) => (
                  <div
                    key={item.id}
                    className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                  >
                    <div>
                      <div className="font-semibold">{item.name}</div>
                      <div className="text-sm text-zinc-500">
                        {item.dueDate} · {item.category || item.source}
                      </div>
                    </div>
                    <div className="font-bold">{formatUSD(item.amount)}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-zinc-400">Loading calendar...</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
