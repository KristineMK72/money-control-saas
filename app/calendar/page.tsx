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
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BillRow = {
  id: string;
  name: string;
  target: number | string | null;
  monthly_target: number | string | null;
  due_date: string | null;
  due?: string | null;
  due_day: number | string | null;
  is_monthly: boolean | null;
  category?: string | null;
};

type DebtRow = {
  id: string;
  name: string;
  balance: number | string | null;
  min_payment: number | string | null;
  monthly_min_payment: number | string | null;
  due_date: string | null;
  due_day: number | string | null;
  is_monthly: boolean | null;
};

type PaymentRow = {
  id: string;
  amount: number | string | null;
  bill_id: string | null;
  debt_id: string | null;
  date_iso: string | null;
  created_at?: string | null;
};

type CalendarItem = {
  id: string;
  sourceId: string;
  name: string;
  amount: number;
  originalAmount: number;
  paidThisMonth: number;
  date: Date;
  type: "bill" | "debt";
  isPaidThisMonth: boolean;
};

type WeekSummary = {
  weekNumber: number;
  label: string;
  start: Date;
  end: Date;
  total: number;
  items: CalendarItem[];
};

const next7CardClass =
  "rounded-2xl border border-amber-200 bg-amber-50 p-4 text-zinc-950 shadow-sm";

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
  dueDate: string | null | undefined,
  dueDay: number | string | null | undefined,
  isMonthly: boolean | null | undefined,
  year: number,
  month: number
) {
  const parsed = dueDate ? new Date(`${dueDate}T00:00:00`) : null;
  const day = Number(dueDay);

  if (Number.isFinite(day) && day >= 1 && day <= 31) {
    return safeDate(year, month, day);
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

function startOfToday() {
  const today = new Date();
  return new Date(today.getFullYear(), today.getMonth(), today.getDate());
}

function billAmount(bill: BillRow) {
  return clampMoney(bill.monthly_target ?? bill.target);
}

function debtMinimum(debt: DebtRow) {
  return clampMoney(debt.monthly_min_payment ?? debt.min_payment);
}

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
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

      const [billsRes, debtsRes, paymentsRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
        supabase
          .from("payments")
          .select("id, amount, bill_id, debt_id, date_iso, created_at")
          .eq("user_id", user.id),
      ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      if (debtsRes.error) setMessage(debtsRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);

      setBills((billsRes.data || []) as BillRow[]);
      setDebts((debtsRes.data || []) as DebtRow[]);
      setPayments((paymentsRes.data || []) as PaymentRow[]);
      setLoading(false);
    }

    void loadData();
  }, [supabase]);

  const paidThisMonth = useMemo(() => {
    const monthStart = currentMonthStartISO();

    const byBill: Record<string, number> = {};
    const byDebt: Record<string, number> = {};

    payments.forEach((payment) => {
      const date = (payment.date_iso || payment.created_at || "").slice(0, 10);
      if (!date || date < monthStart) return;

      const amount = clampMoney(payment.amount);

      if (payment.bill_id) {
        byBill[payment.bill_id] = (byBill[payment.bill_id] || 0) + amount;
      }

      if (payment.debt_id) {
        byDebt[payment.debt_id] = (byDebt[payment.debt_id] || 0) + amount;
      }
    });

    return { byBill, byDebt };
  }, [payments]);

  const items = useMemo(() => {
    const billItems: CalendarItem[] = bills
      .map((bill) => {
        const date = obligationDate(
          bill.due_date ?? bill.due,
          bill.due_day,
          bill.is_monthly,
          viewYear,
          viewMonth
        );

        if (!date) return null;

        const originalAmount = billAmount(bill);
        const paid = paidThisMonth.byBill[bill.id] || 0;
        const remaining = Math.max(0, originalAmount - paid);

        return {
          id: `bill-${bill.id}`,
          sourceId: bill.id,
          name: bill.name,
          amount: remaining,
          originalAmount,
          paidThisMonth: paid,
          date,
          type: "bill" as const,
          isPaidThisMonth: paid >= originalAmount && originalAmount > 0,
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

        const originalAmount = debtMinimum(debt);
        const paid = paidThisMonth.byDebt[debt.id] || 0;
        const remaining = Math.max(0, originalAmount - paid);

        return {
          id: `debt-${debt.id}`,
          sourceId: debt.id,
          name: debt.name,
          amount: remaining,
          originalAmount,
          paidThisMonth: paid,
          date,
          type: "debt" as const,
          isPaidThisMonth: paid >= originalAmount && originalAmount > 0,
        };
      })
      .filter(Boolean) as CalendarItem[];

    return [...billItems, ...debtItems]
      .filter((item) => item.originalAmount > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bills, debts, paidThisMonth, viewMonth, viewYear]);

  const unpaidItems = useMemo(() => {
    return items.filter((item) => !item.isPaidThisMonth && item.amount > 0);
  }, [items]);

  const next7Items = useMemo(() => {
    const start = startOfToday();
    const end = new Date(start);
    end.setDate(start.getDate() + 7);

    return unpaidItems.filter(
      (item) => sameOrAfter(item.date, start) && sameOrBefore(item.date, end)
    );
  }, [unpaidItems]);

  const next7Total = next7Items.reduce((sum, item) => sum + item.amount, 0);

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

      const weekItems = unpaidItems.filter(
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
  }, [unpaidItems, viewMonth, viewYear]);

  const monthTotal = unpaidItems.reduce((sum, item) => sum + item.amount, 0);

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
      return new Date(current.getFullYear(), current.getMonth() + delta, 1);
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
        subtitle="A weekly map of unpaid bills and minimums, because surprise due dates are rude."
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
        subtitle={`${monthLabel} unpaid obligations and weekly pressure`}
        image={calendarMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Month" value={monthLabel} tone="sky" />
          <MetricCard label="Unpaid due" value={money(monthTotal)} tone="amber" />
          <MetricCard
            label="Heaviest week"
            value={heaviestWeek ? money(heaviestWeek.total) : "$0.00"}
            helper={heaviestWeek?.label || "No obligations"}
            tone={heaviestWeek?.total ? "rose" : "zinc"}
          />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Next 7 Days Summary"
        subtitle="Unpaid obligations coming due soon"
        image="/ben-overdraft.png"
        defaultOpen
      >
        <section className="grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Next 7 days"
            value={money(next7Total)}
            helper={`${next7Items.length} unpaid item(s)`}
            tone={next7Total > 0 ? "rose" : "emerald"}
          />

          <MetricCard
            label="First due"
            value={next7Items[0]?.name || "Nothing due"}
            helper={next7Items[0] ? iso(next7Items[0].date) : "Enjoy the quiet"}
            tone={next7Items[0] ? "amber" : "emerald"}
          />

          <MetricCard
            label="Largest due"
            value={
              next7Items.length > 0
                ? money([...next7Items].sort((a, b) => b.amount - a.amount)[0].amount)
                : "$0.00"
            }
            helper={
              next7Items.length > 0
                ? [...next7Items].sort((a, b) => b.amount - a.amount)[0].name
                : "No unpaid items"
            }
            tone={next7Items.length > 0 ? "rose" : "emerald"}
          />
        </section>

        <div className="mt-5 grid gap-3">
          {next7Items.length === 0 ? (
            <div className={next7CardClass}>
              <p className="font-black">No unpaid items due in the next 7 days.</p>
              <p className="mt-1 text-sm font-semibold text-zinc-700">
                A rare and glorious calm, Governor.
              </p>
            </div>
          ) : (
            next7Items.map((item) => (
              <div key={item.id} className={next7CardClass}>
                <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                  <div>
                    <p className="font-black">{item.name}</p>
                    <p className="text-sm font-semibold text-zinc-700">
                      {item.type} • due {iso(item.date)}
                    </p>
                    {item.paidThisMonth > 0 && (
                      <p className="mt-1 text-xs font-black text-emerald-700">
                        Paid this month: {money(item.paidThisMonth)} • remaining:{" "}
                        {money(item.amount)}
                      </p>
                    )}
                  </div>

                  <p className="text-xl font-black">{money(item.amount)}</p>
                </div>
              </div>
            ))
          )}
        </div>
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
                        item.isPaidThisMonth
                          ? "bg-emerald-100 text-emerald-800 line-through"
                          : item.type === "bill"
                            ? "bg-sky-100 text-sky-800"
                            : "bg-rose-100 text-rose-800"
                      }`}
                      title={`${item.name} - ${money(item.amount)}`}
                    >
                      {item.isPaidThisMonth ? "✓ " : ""}
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
        subtitle="Each week shows how much unpaid money needs to be covered"
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
                        No unpaid due items. Enjoy the quiet.
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

                              {item.paidThisMonth > 0 && (
                                <p className="mt-1 text-xs font-black text-emerald-700">
                                  Paid {money(item.paidThisMonth)}
                                </p>
                              )}
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
