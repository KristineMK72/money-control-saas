// app/calendar/page.tsx
"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { ChevronLeft, ChevronRight, Calendar, Clock } from "lucide-react";

type BillRow = {
  id: string;
  user_id: string;
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
  daysUntil: number;
};

const WEEKDAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const CATEGORY_COLORS: Record<string, string> = {
  housing: "bg-red-500/10 text-red-400 border-red-500/30",
  utilities: "bg-amber-500/10 text-amber-400 border-amber-500/30",
  transportation: "bg-blue-500/10 text-blue-400 border-blue-500/30",
  food: "bg-emerald-500/10 text-emerald-400 border-emerald-500/30",
  credit: "bg-purple-500/10 text-purple-400 border-purple-500/30",
  loan: "bg-indigo-500/10 text-indigo-400 border-indigo-500/30",
  other: "bg-zinc-500/10 text-zinc-400 border-zinc-500/30",
};

export default function CalendarPage() {
  const supabase = createSupabaseBrowserClient();
  const now = new Date();

  const [loading, setLoading] = useState(true);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [viewYear, setViewYear] = useState(now.getFullYear());
  const [viewMonth, setViewMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // Load data
  useEffect(() => {
    let mounted = true;

    async function loadData() {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/signup?mode=login";
        return;
      }

      const [billsRes, debtsRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
      ]);

      if (mounted) {
        setBills(billsRes.data || []);
        setDebts(debtsRes.data || []);
        setLoading(false);
      }
    }

    loadData();
    return () => { mounted = false; };
  }, [supabase]);

  // Calendar Items
  const calendarItems = useMemo(() => {
    const items: CalendarItem[] = [];
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Bills
    for (const bill of bills) {
      let dueDateStr: string | null = null;
      if (bill.due_date) {
        const d = new Date(bill.due_date);
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) dueDateStr = bill.due_date;
      } else if (bill.is_monthly && bill.due_day) {
        const safeDay = Math.min(bill.due_day, new Date(viewYear, viewMonth + 1, 0).getDate());
        dueDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
      }

      if (dueDateStr) {
        const dueDate = new Date(dueDateStr);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        items.push({
          id: `bill-${bill.id}`,
          source: "bill",
          name: bill.name,
          category: bill.category,
          amount: Number(bill.monthly_target || bill.target || 0),
          dueDate: dueDateStr,
          daysUntil: Math.max(0, daysUntil),
        });
      }
    }

    // Debts
    for (const debt of debts) {
      let dueDateStr: string | null = null;
      if (debt.due_date) {
        const d = new Date(debt.due_date);
        if (d.getFullYear() === viewYear && d.getMonth() === viewMonth) dueDateStr = debt.due_date;
      } else if (debt.is_monthly && debt.due_day) {
        const safeDay = Math.min(debt.due_day, new Date(viewYear, viewMonth + 1, 0).getDate());
        dueDateStr = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(safeDay).padStart(2, '0')}`;
      }

      if (dueDateStr) {
        const dueDate = new Date(dueDateStr);
        const daysUntil = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
        items.push({
          id: `debt-${debt.id}`,
          source: "debt",
          name: debt.name,
          category: debt.kind,
          amount: Number(debt.monthly_min_payment || debt.min_payment || 0),
          dueDate: dueDateStr,
          daysUntil: Math.max(0, daysUntil),
        });
      }
    }

    return items.sort((a, b) => a.dueDate.localeCompare(b.dueDate));
  }, [bills, debts, viewYear, viewMonth]);

  const itemsByDate = useMemo(() => {
    const grouped: Record<string, CalendarItem[]> = {};
    calendarItems.forEach(item => {
      if (!grouped[item.dueDate]) grouped[item.dueDate] = [];
      grouped[item.dueDate].push(item);
    });
    return grouped;
  }, [calendarItems]);

  const monthSummary = useMemo(() => {
    return calendarItems.reduce((acc, item) => {
      acc.total += item.amount;
      if (item.source === "bill") acc.bills += item.amount;
      if (item.source === "debt") acc.debts += item.amount;
      return acc;
    }, { total: 0, bills: 0, debts: 0 });
  }, [calendarItems]);

  const upcomingNext7Days = useMemo(() => {
    return calendarItems
      .filter(item => item.daysUntil <= 7)
      .sort((a, b) => a.daysUntil - b.daysUntil);
  }, [calendarItems]);

  const daysGrid = useMemo(() => {
    const firstOfMonth = new Date(viewYear, viewMonth, 1);
    const lastOfMonth = new Date(viewYear, viewMonth + 1, 0);
    const firstWeekday = firstOfMonth.getDay();
    const daysInMonth = lastOfMonth.getDate();

    const cells = [];
    for (let i = 0; i < firstWeekday; i++) cells.push({ iso: null, dayNumber: null, isCurrentMonth: false });
    for (let day = 1; day <= daysInMonth; day++) {
      const iso = `${viewYear}-${String(viewMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      cells.push({ iso, dayNumber: day, isCurrentMonth: true });
    }
    while (cells.length % 7 !== 0) cells.push({ iso: null, dayNumber: null, isCurrentMonth: false });
    return cells;
  }, [viewYear, viewMonth]);

  const goPrevMonth = () => {
    if (viewMonth === 0) {
      setViewMonth(11);
      setViewYear(y => y - 1);
    } else setViewMonth(m => m - 1);
    setSelectedDate(null);
  };

  const goNextMonth = () => {
    if (viewMonth === 11) {
      setViewMonth(0);
      setViewYear(y => y + 1);
    } else setViewMonth(m => m + 1);
    setSelectedDate(null);
  };

  const currentMonthName = new Date(viewYear, viewMonth).toLocaleString('en-US', { 
    month: 'long', year: 'numeric' 
  });

  return (
    <div className="min-h-screen bg-zinc-950 text-white pb-20">
      <div className="max-w-7xl mx-auto px-4 py-8 md:px-6">

        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-10">
          <div>
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold tracking-widest">
              <Calendar className="w-4 h-4" />
              FINANCIAL CALENDAR
            </div>
            <h1 className="text-5xl font-black tracking-tighter mt-4">Calendar</h1>
            <p className="text-zinc-400 mt-3 text-lg">Never miss a due date again.</p>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <p className="text-zinc-500">Total Due This Month</p>
            <p className="text-5xl font-bold mt-4">${monthSummary.total.toFixed(0)}</p>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <p className="text-zinc-500">Bills</p>
            <p className="text-5xl font-bold mt-4 text-orange-400">${monthSummary.bills.toFixed(0)}</p>
          </div>
          <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <p className="text-zinc-500">Debt Minimums</p>
            <p className="text-5xl font-bold mt-4 text-purple-400">${monthSummary.debts.toFixed(0)}</p>
          </div>
        </div>

        {/* Upcoming Next 7 Days */}
        <div className="mb-12">
          <div className="flex items-center gap-3 mb-6">
            <Clock className="w-6 h-6 text-emerald-400" />
            <h2 className="text-2xl font-bold">Upcoming Next 7 Days</h2>
          </div>

          {upcomingNext7Days.length > 0 ? (
            <div className="grid gap-4">
              {upcomingNext7Days.map((item) => {
                const colorClass = CATEGORY_COLORS[item.category || "other"];
                return (
                  <div
                    key={item.id}
                    className="flex items-center justify-between bg-zinc-900 border border-white/10 hover:border-emerald-500/50 rounded-2xl p-6 transition-all"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-3 h-3 rounded-full ${item.source === "bill" ? "bg-orange-400" : "bg-purple-400"}`} />
                      <div>
                        <div className="font-semibold text-lg">{item.name}</div>
                        <div className="text-sm text-zinc-500">
                          {new Date(item.dueDate).toLocaleDateString('en-US', { 
                            weekday: 'long', month: 'short', day: 'numeric' 
                          })}
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold">${item.amount.toFixed(0)}</div>
                      <div className="text-xs text-emerald-400 font-medium">
                        {item.daysUntil === 0 ? "Due Today" : 
                         item.daysUntil === 1 ? "Tomorrow" : `In ${item.daysUntil} days`}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-zinc-900 border border-white/10 rounded-3xl p-12 text-center text-zinc-400">
              No payments due in the next 7 days. Nice!
            </div>
          )}
        </div>

        {/* Main Calendar */}
        <div className="bg-zinc-900 border border-white/10 rounded-3xl p-8 md:p-10">
          <div className="flex items-center justify-between mb-8">
            <button onClick={goPrevMonth} className="p-3 hover:bg-white/5 rounded-2xl transition">
              <ChevronLeft className="w-6 h-6" />
            </button>
            <h2 className="text-3xl font-bold">{currentMonthName}</h2>
            <button onClick={goNextMonth} className="p-3 hover:bg-white/5 rounded-2xl transition">
              <ChevronRight className="w-6 h-6" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-2 mb-3">
            {WEEKDAYS.map(day => (
              <div key={day} className="text-center text-sm font-medium text-zinc-500 py-2">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-2">
            {daysGrid.map((cell, idx) => {
              const items = cell.iso ? (itemsByDate[cell.iso] || []) : [];
              const isToday = cell.iso === new Date().toISOString().slice(0, 10);

              return (
                <div
                  key={idx}
                  onClick={() => cell.iso && setSelectedDate(cell.iso)}
                  className={`min-h-[140px] rounded-2xl border p-3 transition-all cursor-pointer hover:border-white/30
                    ${cell.isCurrentMonth 
                      ? isToday 
                        ? "border-emerald-500 bg-emerald-950/60" 
                        : "border-white/10 bg-zinc-950 hover:bg-zinc-900" 
                      : "border-transparent bg-zinc-950/50 opacity-40"
                    }`}
                >
                  {cell.dayNumber && (
                    <>
                      <div className={`text-lg font-semibold mb-3 ${isToday ? "text-emerald-400" : ""}`}>
                        {cell.dayNumber}
                      </div>
                      <div className="space-y-1.5">
                        {items.slice(0, 3).map((item) => {
                          const colorClass = CATEGORY_COLORS[item.category || "other"];
                          return (
                            <div key={item.id} className={`text-xs rounded-xl px-3 py-1.5 border ${colorClass}`}>
                              <div className="font-medium line-clamp-1">{item.name}</div>
                              <div>${item.amount.toFixed(0)}</div>
                            </div>
                          );
                        })}
                        {items.length > 3 && (
                          <div className="text-[10px] text-zinc-500 pl-1">+{items.length - 3} more</div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Selected Date Details */}
        {selectedDate && itemsByDate[selectedDate] && (
          <div className="mt-10 bg-zinc-900 border border-white/10 rounded-3xl p-8">
            <h3 className="text-2xl font-bold mb-6">
              Due on {new Date(selectedDate).toLocaleDateString('en-US', { 
                weekday: 'long', month: 'long', day: 'numeric' 
              })}
            </h3>
            <div className="space-y-4">
              {itemsByDate[selectedDate].map(item => (
                <div key={item.id} className="flex justify-between items-center bg-zinc-950 border border-white/10 rounded-2xl p-6">
                  <div>
                    <div className="font-semibold text-lg">{item.name}</div>
                    <div className="text-zinc-500 text-sm">
                      {item.source === "bill" ? "Bill" : "Debt Minimum"}
                    </div>
                  </div>
                  <div className="text-3xl font-bold">${item.amount.toFixed(0)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
