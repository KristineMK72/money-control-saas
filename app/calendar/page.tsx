"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";

/* ─── Types (unchanged) ─────────────────────────────────────────── */

type BillRow = {
  id: string; name: string;
  target: number | string | null; monthly_target: number | string | null;
  due_date: string | null; due?: string | null;
  due_day: number | string | null; is_monthly: boolean | null;
  category?: string | null;
};

type DebtRow = {
  id: string; name: string;
  balance: number | string | null;
  min_payment: number | string | null; monthly_min_payment: number | string | null;
  due_date: string | null; due_day: number | string | null;
  is_monthly: boolean | null;
};

type PaymentRow = {
  id: string; amount: number | string | null;
  bill_id: string | null; debt_id: string | null;
  date_iso: string | null; created_at?: string | null;
};

type CalendarItem = {
  id: string; sourceId: string; name: string;
  amount: number; originalAmount: number; paidThisMonth: number;
  date: Date; type: "bill" | "debt"; isPaidThisMonth: boolean;
};

type WeekSummary = {
  weekNumber: number; label: string;
  start: Date; end: Date; total: number; items: CalendarItem[];
};

/* ─── Helpers (unchanged) ───────────────────────────────────────── */

function iso(date: Date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function safeDate(year: number, month: number, day: number) {
  const lastDay = new Date(year, month + 1, 0).getDate();
  return new Date(year, month, Math.min(Math.max(day, 1), lastDay));
}

function obligationDate(
  dueDate: string | null | undefined, dueDay: number | string | null | undefined,
  isMonthly: boolean | null | undefined, year: number, month: number
) {
  const parsed = dueDate ? new Date(`${dueDate}T00:00:00`) : null;
  const day = Number(dueDay);
  if (Number.isFinite(day) && day >= 1 && day <= 31) return safeDate(year, month, day);
  if (parsed && isMonthly) return safeDate(year, month, parsed.getDate());
  if (parsed && parsed.getFullYear() === year && parsed.getMonth() === month) return parsed;
  return null;
}

function sameOrBefore(a: Date, b: Date) { return a.getTime() <= b.getTime(); }
function sameOrAfter(a: Date, b: Date)  { return a.getTime() >= b.getTime(); }
function dayName(date: Date) { return date.toLocaleDateString("en-US", { weekday: "short" }); }
function startOfToday() { const t = new Date(); return new Date(t.getFullYear(), t.getMonth(), t.getDate()); }
function billAmount(bill: BillRow)  { return clampMoney(bill.monthly_target ?? bill.target); }
function debtMinimum(debt: DebtRow) { return clampMoney(debt.monthly_min_payment ?? debt.min_payment); }

/* ─── UI primitives ─────────────────────────────────────────────── */

const CARD: React.CSSProperties = {
  background: "rgba(15,8,4,0.88)", border: "1px solid rgba(107,68,35,0.5)",
  backdropFilter: "blur(4px)", borderRadius: "0.75rem", padding: "1.25rem",
};

function Section({ title, subtitle, children }: {
  title: string; subtitle?: string; children: React.ReactNode;
}) {
  return (
    <div style={CARD}>
      <div className="mb-4 pb-3" style={{ borderBottom: "1px solid rgba(107,68,35,0.3)" }}>
        <h2 className="font-cinzel text-lg font-bold" style={{ color: "#c9a84c" }}>{title}</h2>
        {subtitle && <p className="text-sm mt-0.5 italic" style={{ color: "#9a7d5a" }}>{subtitle}</p>}
      </div>
      {children}
    </div>
  );
}

function MetricTile({ label, value, helper, accent = false }: {
  label: string; value: string; helper?: string; accent?: boolean;
}) {
  return (
    <div className="rounded-xl p-4 text-center"
         style={{ background: "rgba(107,68,35,0.15)", border: "1px solid rgba(107,68,35,0.3)" }}>
      <p className="text-[10px] uppercase tracking-widest font-cinzel mb-1" style={{ color: "#9a7d5a" }}>{label}</p>
      <p className="text-xl font-bold font-cinzel" style={{ color: accent ? "#f87171" : "#c9a84c" }}>{value}</p>
      {helper && <p className="text-[11px] mt-1 italic" style={{ color: "#6b4423" }}>{helper}</p>}
    </div>
  );
}

function NavBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button onClick={onClick}
            className="rounded-lg px-4 py-2 text-xs font-cinzel font-bold uppercase tracking-wide transition"
            style={{ background: "rgba(107,68,35,0.3)", border: "1px solid rgba(201,168,76,0.4)",
                     color: "#c9a84c" }}>
      {children}
    </button>
  );
}

/* ─── Page ──────────────────────────────────────────────────────── */

export default function CalendarPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills,    setBills]    = useState<BillRow[]>([]);
  const [debts,    setDebts]    = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading,  setLoading]  = useState(true);
  const [message,  setMessage]  = useState("");

  const [viewDate, setViewDate] = useState(() => {
    const today = new Date();
    return new Date(today.getFullYear(), today.getMonth(), 1);
  });

  const [expandedWeeks, setExpandedWeeks] = useState<Record<number, boolean>>({});

  const now        = new Date();
  const viewYear   = viewDate.getFullYear();
  const viewMonth  = viewDate.getMonth();

  /* ── Data fetch (unchanged) ── */
  useEffect(() => {
    async function loadData() {
      setLoading(true); setMessage("");
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) { setMessage(error.message); setLoading(false); return; }
      if (!user)  { setMessage("Sign in to build your weekly money map."); setLoading(false); return; }

      const [billsRes, debtsRes, paymentsRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", user.id),
        supabase.from("debts").select("*").eq("user_id", user.id),
        supabase.from("payments").select("id, amount, bill_id, debt_id, date_iso, created_at").eq("user_id", user.id),
      ]);

      if (billsRes.error)    setMessage(billsRes.error.message);
      if (debtsRes.error)    setMessage(debtsRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);

      setBills((billsRes.data    || []) as BillRow[]);
      setDebts((debtsRes.data    || []) as DebtRow[]);
      setPayments((paymentsRes.data || []) as PaymentRow[]);
      setLoading(false);
    }
    void loadData();
  }, [supabase]);

  /* ── Derived (all unchanged) ── */
  const paidThisMonth = useMemo(() => {
    const monthStart = currentMonthStartISO();
    const byBill: Record<string, number> = {};
    const byDebt: Record<string, number> = {};
    payments.forEach(p => {
      const date = (p.date_iso || p.created_at || "").slice(0, 10);
      if (!date || date < monthStart) return;
      const amt = clampMoney(p.amount);
      if (p.bill_id) byBill[p.bill_id] = (byBill[p.bill_id] || 0) + amt;
      if (p.debt_id) byDebt[p.debt_id] = (byDebt[p.debt_id] || 0) + amt;
    });
    return { byBill, byDebt };
  }, [payments]);

  const items = useMemo(() => {
    const billItems: CalendarItem[] = bills.map(bill => {
      const date = obligationDate(bill.due_date ?? bill.due, bill.due_day, bill.is_monthly, viewYear, viewMonth);
      if (!date) return null;
      const orig = billAmount(bill);
      const paid = paidThisMonth.byBill[bill.id] || 0;
      return { id: `bill-${bill.id}`, sourceId: bill.id, name: bill.name,
               amount: Math.max(0, orig - paid), originalAmount: orig, paidThisMonth: paid,
               date, type: "bill" as const, isPaidThisMonth: paid >= orig && orig > 0 };
    }).filter(Boolean) as CalendarItem[];

    const debtItems: CalendarItem[] = debts.map(debt => {
      const date = obligationDate(debt.due_date, debt.due_day, debt.is_monthly, viewYear, viewMonth);
      if (!date) return null;
      const orig = debtMinimum(debt);
      const paid = paidThisMonth.byDebt[debt.id] || 0;
      return { id: `debt-${debt.id}`, sourceId: debt.id, name: debt.name,
               amount: Math.max(0, orig - paid), originalAmount: orig, paidThisMonth: paid,
               date, type: "debt" as const, isPaidThisMonth: paid >= orig && orig > 0 };
    }).filter(Boolean) as CalendarItem[];

    return [...billItems, ...debtItems]
      .filter(i => i.originalAmount > 0)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [bills, debts, paidThisMonth, viewMonth, viewYear]);

  const unpaidItems = useMemo(() => items.filter(i => !i.isPaidThisMonth && i.amount > 0), [items]);

  const next7Items = useMemo(() => {
    const start = startOfToday();
    const end   = new Date(start); end.setDate(start.getDate() + 7);
    return unpaidItems.filter(i => sameOrAfter(i.date, start) && sameOrBefore(i.date, end));
  }, [unpaidItems]);

  const next7Total = next7Items.reduce((s, i) => s + i.amount, 0);

  const calendarCells = useMemo(() => {
    const firstDay    = new Date(viewYear, viewMonth, 1);
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
    const startOffset = firstDay.getDay();
    return Array.from({ length: startOffset + daysInMonth }, (_, idx) => {
      const dayNumber = idx - startOffset + 1;
      if (dayNumber <= 0) return null;
      const date     = new Date(viewYear, viewMonth, dayNumber);
      const dayItems = items.filter(i => iso(i.date) === iso(date));
      return { dayNumber, date, items: dayItems, total: dayItems.reduce((s, i) => s + i.amount, 0) };
    });
  }, [items, viewMonth, viewYear]);

  const weekSummaries = useMemo<WeekSummary[]>(() => {
    const first = new Date(viewYear, viewMonth, 1);
    const last  = new Date(viewYear, viewMonth + 1, 0);
    const weeks: WeekSummary[] = [];
    let start = new Date(first); let weekNumber = 1;
    while (sameOrBefore(start, last)) {
      const end = new Date(start); end.setDate(start.getDate() + 6);
      if (end > last) end.setTime(last.getTime());
      const weekItems = unpaidItems.filter(i => sameOrAfter(i.date, start) && sameOrBefore(i.date, end));
      weeks.push({ weekNumber, label: `Week ${weekNumber}`, start: new Date(start), end: new Date(end),
                   total: weekItems.reduce((s, i) => s + i.amount, 0), items: weekItems });
      start.setDate(start.getDate() + 7); weekNumber++;
    }
    return weeks;
  }, [unpaidItems, viewMonth, viewYear]);

  const monthTotal    = unpaidItems.reduce((s, i) => s + i.amount, 0);
  const heaviestWeek  = [...weekSummaries].sort((a, b) => b.total - a.total)[0];
  const monthLabel    = viewDate.toLocaleString("en-US", { month: "long", year: "numeric" });
  const yearChoices   = Array.from({ length: 7 }, (_, i) => now.getFullYear() - 3 + i);

  const benInsight = BenEngine.getForecastMessage({
    name: null, timeframeLabel: monthLabel, totalNeeded: monthTotal,
    incomeSoFar: 0, incomeGap: monthTotal, dailyIncomeNeeded: Math.ceil(monthTotal / 30),
  });

  function shiftMonth(delta: number) {
    setViewDate(c => new Date(c.getFullYear(), c.getMonth() + delta, 1));
    setExpandedWeeks({});
  }
  function goToCurrentMonth() {
    const t = new Date();
    setViewDate(new Date(t.getFullYear(), t.getMonth(), 1));
    setExpandedWeeks({});
  }
  function changeMonth(month: number) {
    setViewDate(c => new Date(c.getFullYear(), month, 1)); setExpandedWeeks({});
  }
  function changeYear(year: number) {
    setViewDate(c => new Date(year, c.getMonth(), 1)); setExpandedWeeks({});
  }

  /* ── Loading ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-postoffice bg-cover bg-center">
        <div style={{ ...CARD, padding: "2rem 3rem", textAlign: "center" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Consulting the almanac&hellip;
          </p>
        </div>
      </div>
    );
  }

  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-zinc-950/82 -md text-white">
      <div className="mx-auto max-w-7xl px-4 py-8 md:px-6 md:py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-5 shadow-2xl md:p-8">
          <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
=======
    <div className="min-h-screen bg-ben-postoffice bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-28" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-2">
>>>>>>> ed0e3caecb0f44437c318e467ad26eae9d5ac2c6
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-cinzel font-semibold"
                 style={{ color: "#6b4423" }}>AskBen Calendar</p>
              <h1 className="font-cinzel text-4xl font-bold mt-1" style={{ color: "#c9a84c" }}>
                The Money Map
              </h1>
              <p className="mt-1 text-sm italic" style={{ color: "#9a7d5a" }}>
                A weekly ledger of unpaid bills and minimums &mdash; because surprise due dates are rude.
              </p>
            </div>
            <div className="flex gap-2 shrink-0">
              <NavBtn onClick={() => shiftMonth(-1)}>← Prev</NavBtn>
              <NavBtn onClick={goToCurrentMonth}>This Month</NavBtn>
              <NavBtn onClick={() => shiftMonth(1)}>Next →</NavBtn>
            </div>
          </div>

          {/* ── Notice ── */}
          {message && (
            <div className="rounded-xl px-4 py-3 text-sm"
                 style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)",
                          color: "#c9a84c" }}>
              ✦ {message}
            </div>
          )}

          {/* ── Calendar Briefing ── */}
          <Section title="Calendar Briefing" subtitle={`${monthLabel} unpaid obligations and weekly pressure`}>
            <BenBubble message={benInsight.text} mood={benInsight.mood} />
            <div className="mt-4 grid gap-3 md:grid-cols-3">
              <MetricTile label="Month"         value={monthLabel} />
              <MetricTile label="Unpaid Due"    value={money(monthTotal)} accent={monthTotal > 0} />
              <MetricTile label="Heaviest Week"
                          value={heaviestWeek ? money(heaviestWeek.total) : "$0.00"}
                          helper={heaviestWeek?.label || "No obligations"}
                          accent={!!heaviestWeek?.total} />
            </div>
          </Section>

          {/* ── Next 7 Days ── */}
          <Section title="Next 7 Days" subtitle="Unpaid obligations coming due soon">
            <div className="grid gap-3 md:grid-cols-3 mb-4">
              <MetricTile label="Next 7 Days Total"
                          value={money(next7Total)}
                          helper={`${next7Items.length} unpaid item(s)`}
                          accent={next7Total > 0} />
              <MetricTile label="First Due"
                          value={next7Items[0]?.name || "Nothing due"}
                          helper={next7Items[0] ? iso(next7Items[0].date) : "Enjoy the quiet"} />
              <MetricTile label="Largest Due"
                          value={next7Items.length > 0
                            ? money([...next7Items].sort((a, b) => b.amount - a.amount)[0].amount)
                            : "$0.00"}
                          helper={next7Items.length > 0
                            ? [...next7Items].sort((a, b) => b.amount - a.amount)[0].name
                            : "No unpaid items"}
                          accent={next7Items.length > 0} />
            </div>

            <div className="space-y-2">
              {next7Items.length === 0 ? (
                <div className="rounded-xl px-4 py-5 text-center"
                     style={{ background: "rgba(74,138,66,0.1)", border: "1px solid rgba(74,138,66,0.3)" }}>
                  <p className="font-cinzel text-sm" style={{ color: "#4ade80" }}>
                    ✦ No unpaid items due in the next 7 days. A rare and glorious calm, Governor.
                  </p>
                </div>
              ) : (
                next7Items.map(item => (
                  <div key={item.id} className="rounded-xl p-4 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"
                       style={{ background: "rgba(248,113,113,0.07)", border: "1px solid rgba(248,113,113,0.3)" }}>
                    <div>
                      <p className="font-cinzel font-bold" style={{ color: "#e8d5b7" }}>{item.name}</p>
                      <p className="text-xs mt-0.5" style={{ color: "#9a7d5a" }}>
                        {item.type} &bull; due {iso(item.date)}
                      </p>
                      {item.paidThisMonth > 0 && (
                        <p className="text-xs mt-1 font-semibold" style={{ color: "#4ade80" }}>
                          Paid this month: {money(item.paidThisMonth)} &bull; remaining: {money(item.amount)}
                        </p>
                      )}
                    </div>
                    <p className="font-cinzel text-xl font-bold shrink-0" style={{ color: "#f87171" }}>
                      {money(item.amount)}
                    </p>
                  </div>
                ))
              )}
            </div>
          </Section>

          {/* ── Monthly Money Map (calendar grid) ── */}
          <Section title="Monthly Money Map" subtitle="Bills and debts laid out by day">
            {/* Controls */}
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <p className="font-cinzel text-xl font-bold" style={{ color: "#c9a84c" }}>{monthLabel}</p>
              <div className="flex flex-wrap items-center gap-2">
                <select value={viewMonth} onChange={e => changeMonth(Number(e.target.value))}
                        className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={{ background: "#f5e6c8", color: "#2d1810", border: "1px solid #c9a84c",
                                 fontFamily: "Cinzel, serif" }}>
                  {Array.from({ length: 12 }, (_, m) => (
                    <option key={m} value={m}>
                      {new Date(2026, m, 1).toLocaleString("en-US", { month: "long" })}
                    </option>
                  ))}
                </select>
                <select value={viewYear} onChange={e => changeYear(Number(e.target.value))}
                        className="rounded-lg px-3 py-2 text-sm focus:outline-none"
                        style={{ background: "#f5e6c8", color: "#2d1810", border: "1px solid #c9a84c",
                                 fontFamily: "Cinzel, serif" }}>
                  {yearChoices.map(y => <option key={y} value={y}>{y}</option>)}
                </select>
                <NavBtn onClick={goToCurrentMonth}>This Month</NavBtn>
              </div>
            </div>

            {/* Day-of-week headers */}
            <div className="grid grid-cols-7 gap-1 text-center mb-2">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map(d => (
                <div key={d} className="text-[10px] font-cinzel font-bold uppercase tracking-widest py-1"
                     style={{ color: "#6b4423" }}>{d}</div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarCells.map((cell, idx) => {
                if (!cell) return <div key={`blank-${idx}`} className="min-h-[90px]" />;

                const isToday = cell.date.getFullYear() === now.getFullYear()
                             && cell.date.getMonth()    === now.getMonth()
                             && cell.date.getDate()     === now.getDate();

                return (
                  <div key={iso(cell.date)} className="min-h-[90px] rounded-lg p-1.5"
                       style={{
                         background: isToday ? "rgba(201,168,76,0.15)" : "rgba(15,8,4,0.6)",
                         border: `1px solid ${isToday ? "rgba(201,168,76,0.6)" : "rgba(107,68,35,0.3)"}`,
                       }}>
                    <div className="flex items-start justify-between gap-1">
                      <div>
                        <p className="text-sm font-bold font-cinzel leading-none"
                           style={{ color: isToday ? "#c9a84c" : "#e8d5b7" }}>{cell.dayNumber}</p>
                        <p className="text-[9px] uppercase md:hidden" style={{ color: "#6b4423" }}>
                          {dayName(cell.date)}
                        </p>
                      </div>
                      {cell.total > 0 && (
                        <span className="rounded-full px-1.5 py-0.5 text-[9px] font-bold leading-none"
                              style={{ background: "rgba(201,168,76,0.25)", color: "#c9a84c",
                                       border: "1px solid rgba(201,168,76,0.4)" }}>
                          {money(cell.total)}
                        </span>
                      )}
                    </div>

                    <div className="mt-1 space-y-0.5">
                      {cell.items.slice(0, 3).map(item => (
                        <div key={item.id}
                             className="truncate rounded px-1.5 py-0.5 text-[10px] leading-tight"
                             title={`${item.name} — ${money(item.amount)}`}
                             style={item.isPaidThisMonth
                               ? { background: "rgba(74,222,128,0.15)", color: "#4ade80",
                                   textDecoration: "line-through", border: "1px solid rgba(74,222,128,0.2)" }
                               : item.type === "bill"
                               ? { background: "rgba(96,153,229,0.15)", color: "#93c5fd",
                                   border: "1px solid rgba(96,153,229,0.25)" }
                               : { background: "rgba(248,113,113,0.15)", color: "#fca5a5",
                                   border: "1px solid rgba(248,113,113,0.25)" }
                             }>
                          {item.isPaidThisMonth ? "✓ " : ""}{item.name}
                        </div>
                      ))}
                      {cell.items.length > 3 && (
                        <p className="text-[9px]" style={{ color: "#6b4423" }}>
                          +{cell.items.length - 3} more
                        </p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </Section>

          {/* ── Weekly Income Targets ── */}
          <Section title="Weekly Income Targets" subtitle="Each week shows how much unpaid money must be covered">
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              {weekSummaries.map(week => {
                const open = expandedWeeks[week.weekNumber] ?? week.total > 0;
                const isHeaviest = heaviestWeek?.weekNumber === week.weekNumber && week.total > 0;

                return (
                  <div key={week.weekNumber} className="rounded-xl"
                       style={{
                         background: isHeaviest ? "rgba(248,113,113,0.07)" : "rgba(107,68,35,0.12)",
                         border: `1px solid ${isHeaviest ? "rgba(248,113,113,0.4)" : "rgba(107,68,35,0.4)"}`,
                       }}>
                    <button onClick={() => setExpandedWeeks(prev => ({ ...prev, [week.weekNumber]: !open }))}
                            className="w-full text-left p-4">
                      <div className="flex items-center justify-between">
                        <p className="text-[10px] uppercase tracking-widest font-cinzel font-bold"
                           style={{ color: isHeaviest ? "#f87171" : "#9a7d5a" }}>
                          {week.label} {isHeaviest ? "⚠" : ""}
                        </p>
                        <span className="text-xs" style={{ color: "#6b4423" }}>{open ? "▲" : "▼"}</span>
                      </div>
                      <p className="text-xs mt-0.5" style={{ color: "#6b4423" }}>
                        {iso(week.start)} &rarr; {iso(week.end)}
                      </p>
                      <p className="mt-3 text-2xl font-bold font-cinzel"
                         style={{ color: isHeaviest ? "#f87171" : "#c9a84c" }}>
                        {money(week.total)}
                      </p>
                    </button>

                    {open && (
                      <div className="px-4 pb-4 space-y-2">
                        {week.items.length === 0 ? (
                          <p className="text-xs italic" style={{ color: "#6b4423" }}>
                            No unpaid items. Enjoy the quiet.
                          </p>
                        ) : (
                          week.items.map(item => (
                            <div key={item.id} className="rounded-lg p-3"
                                 style={{ background: "rgba(15,8,4,0.5)", border: "1px solid rgba(107,68,35,0.3)" }}>
                              <div className="flex items-start justify-between gap-2">
                                <div className="min-w-0">
                                  <p className="font-cinzel text-sm font-bold truncate" style={{ color: "#e8d5b7" }}>
                                    {item.name}
                                  </p>
                                  <p className="text-[10px] uppercase tracking-wide mt-0.5" style={{ color: "#6b4423" }}>
                                    {item.type} &bull; {iso(item.date)}
                                  </p>
                                  {item.paidThisMonth > 0 && (
                                    <p className="text-[11px] mt-1" style={{ color: "#4ade80" }}>
                                      Paid {money(item.paidThisMonth)}
                                    </p>
                                  )}
                                </div>
                                <p className="font-cinzel font-bold shrink-0" style={{ color: "#c9a84c" }}>
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
          </Section>

          {/* ── Quote ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;Lost time is never found again.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
