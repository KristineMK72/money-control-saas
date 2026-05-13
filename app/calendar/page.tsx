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
  target: number;
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

const shellCard =
  "rounded-[32px] border border-white/50 bg-white/94 p-5 text-zinc-950 shadow-2xl md:p-8";

const card =
  "rounded-3xl border border-white/60 bg-white/94 p-5 text-zinc-950 shadow-xl";

const darkButton =
  "rounded-xl border border-zinc-300 bg-white px-4 py-3 text-sm font-semibold text-zinc-950 hover:bg-zinc-100";

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
      return "bg-red-100 text-red-800 border-red-200";
    case "utilities":
      return "bg-amber-100 text-amber-800 border-amber-200";
    case "transportation":
      return "bg-blue-100 text-blue-800 border-blue-200";
    case "credit":
      return "bg-purple-100 text-purple-800 border-purple-200";
    case "loan":
      return "bg-indigo-100 text-indigo-800 border-indigo-200";
    default:
      return "bg-zinc-100 text-zinc-800 border-zinc-200";
  }
}

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [debugUser, setDebugUser] = useState("");

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

      setDebugUser(`${user.email || "unknown"} · ${user.id}`);

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
        dueDate = isoFromYMD(viewYear, viewMonth, clampDay(viewYear, viewMonth, bill.due_day));
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
        if (parsed.getFullYear() === viewYear && parsed.getMonth() === viewMonth) {
          dueDate = debt.due_date;
        }
      } else if (debt.is_monthly && debt.due_day) {
        dueDate = isoFromYMD(viewYear, viewMonth, clampDay(viewYear, viewMonth, debt.due_day));
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

    const cells: Array<{
      iso: string | null;
      dayNumber: number | null;
      isCurrentMonth: boolean;
    }> = [];

    for (let i = 0; i < firstOfMonth.getDay(); i++) {
      cells.push({ iso: null, dayNumber: null, isCurrentMonth: false });
    }

    for (let day = 1; day <= lastOfMonth.getDate(); day++) {
      cells.push({
        iso: isoFromYMD(viewYear, viewMonth, day),
        dayNumber: day,
        isCurrentMonth: true,
      });
    }

    while (cells.length % 7 !== 0) {
      cells.push({ iso: null, dayNumber: null, isCurrentMonth: false });
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
    <main className="min-h-screen bg-transparent p-4 text-zinc-950 md:p-8">
      <div className="mx-auto max-w-7xl">
        <section className={shellCard}>
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-300 bg-emerald-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.2em] text-emerald-800">
                Due dates
              </div>

              <h1 className="mt-4 text-4xl font-black tracking-tight text-zinc-950">
                Calendar
              </h1>

              <p className="mt-3 max-w-2xl text-lg text-zinc-700">
                See bills and debt due dates in one monthly calendar view.
              </p>

              {debugUser ? (
                <p className="mt-2 text-xs text-zinc-500">Logged in as: {debugUser}</p>
              ) : null}
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/dashboard" className={darkButton}>Dashboard</a>
              <a href="/bills" className={darkButton}>Bills</a>
              <a href="/debt" className={darkButton}>Credit & Loans</a>
              <a href="/forecast" className={darkButton}>Forecast</a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-900">
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            <SummaryCard label="Total due this month" value={formatUSD(monthSummary.total)} />
            <SummaryCard label="Bills this month" value={formatUSD(monthSummary.bills)} />
            <SummaryCard label="Debt minimums this month" value={formatUSD(monthSummary.debts)} />
          </div>

          <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-4 text-zinc-950 shadow-xl md:p-6">
            <div className="mb-5 flex items-center justify-between gap-3">
              <button onClick={goPrevMonth} className={darkButton}>
                ← Prev
              </button>

              <h2 className="text-center text-xl font-black">
                {getMonthName(viewYear, viewMonth)}
              </h2>

              <button onClick={goNextMonth} className={darkButton}>
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
                              className={`rounded-xl border px-2 py-2 text-[11px] leading-4 md:text-xs ${categoryTone(
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

          <div className={`${card} mt-8`}>
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
        </section>
      </div>
    </main>
  );
}

function SummaryCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={card}>
      <div className="text-sm text-zinc-600">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
