"use client";

import { useEffect, useMemo, useState } from "react";
import BenBubble from "@/components/BenBubble";
import GovernorsOrders from "@/components/GovernorsOrders";
import XpBar from "@/components/XpBar";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ─── Types (unchanged) ─────────────────────────────────────────── */

type SpendRow = {
  id: string;
  amount: number | string | null;
  category: string | null;
};

type BillRow = {
  id: string;
  name: string | null;
  kind?: string | null;
  category?: string | null;
  target?: number | string | null;
  monthly_target?: number | string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  due_date?: string | null;
  due?: string | null;
  due_day?: number | string | null;
  focus?: boolean | null;
};

type DebtRow = {
  id: string;
  name: string | null;
  kind?: string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  monthly_min_payment?: number | string | null;
  due_date?: string | null;
  due_day?: number | string | null;
  apr?: number | string | null;
};

type PaymentRow = {
  id: string;
  amount: number | string | null;
  bill_id: string | null;
  debt_id: string | null;
  date_iso: string | null;
  created_at?: string | null;
};

type BenMasterRow = {
  user_id: string;
  total_income?: number | string | null;
  total_spend?: number | string | null;
  bills?: number | string | null;
  total_bills?: number | string | null;
  total_debt?: number | string | null;
  total_debt_minimums?: number | string | null;
  payments?: number | string | null;
  leftover?: number | string | null;
  pressure_pct?: number | string | null;
  month?: string | null;
};

type ProfileRow = {
  xp?: number | null;
  level?: number | null;
  reputation?: number | null;
};

/* ─── Helpers (unchanged) ───────────────────────────────────────── */

function getColonialRank(reputation: number) {
  if (reputation >= 5000) return "Defender of the Treasury";
  if (reputation >= 2500) return "Founding Financier";
  if (reputation >= 1000) return "Governor";
  if (reputation >= 500)  return "Colonial Magistrate";
  if (reputation >= 250)  return "Treasury Keeper";
  if (reputation >= 100)  return "Town Recorder";
  return "Apprentice Clerk";
}

function billAmount(bill: BillRow) {
  return clampMoney(bill.target ?? bill.monthly_target ?? bill.balance ?? bill.min_payment);
}

function debtMinimum(debt: DebtRow) {
  return clampMoney(debt.monthly_min_payment ?? debt.min_payment);
}

function dueLabel(days: number | null) {
  if (days === null) return "No due date";
  if (days < 0)     return `Overdue by ${Math.abs(days)} day(s)`;
  if (days === 0)   return "Due today";
  if (days === 1)   return "Due tomorrow";
  return `Due in ${days} days`;
}

/* ─── UI primitives ─────────────────────────────────────────────── */

const CARD: React.CSSProperties = {
  background: "rgba(15,8,4,0.88)",
  border: "1px solid rgba(107,68,35,0.5)",
  backdropFilter: "blur(4px)",
  borderRadius: "0.75rem",
  padding: "1.25rem",
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

/* ─── Page ──────────────────────────────────────────────────────── */

export default function DashboardPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);
  const [viewMode, setViewMode] = useState<"month" | "cumulative">("month");

  const [spend,            setSpend]            = useState<SpendRow[]>([]);
  const [billsRows,        setBillsRows]        = useState<BillRow[]>([]);
  const [debtRows,         setDebtRows]         = useState<DebtRow[]>([]);
  const [paymentsRows,     setPaymentsRows]     = useState<PaymentRow[]>([]);
  const [monthlyMaster,    setMonthlyMaster]    = useState<BenMasterRow | null>(null);
  const [cumulativeMaster, setCumulativeMaster] = useState<BenMasterRow | null>(null);
  const [profile,          setProfile]          = useState<ProfileRow | null>(null);
  const [loading,          setLoading]          = useState(true);
  const [notice,           setNotice]           = useState("");

  /* ── Data fetch (unchanged) ── */
  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setNotice("");

      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      if (sessionError || !session?.user) {
        setNotice("Sign in to see your dashboard.");
        setLoading(false);
        return;
      }

      const uid = session.user.id;

      const [spendRes, billsRes, debtsRes, paymentsRes, monthlyRes, cumulativeRes, profileRes] =
        await Promise.all([
          supabase.from("spend_entries").select("id, amount, category").eq("user_id", uid),

          supabase.from("bills")
            .select("id, name, kind, category, target, monthly_target, balance, min_payment, due_date, due, due_day, focus")
            .eq("user_id", uid),

          supabase.from("debts")
            .select("id, name, kind, balance, min_payment, monthly_min_payment, due_date, due_day, apr")
            .eq("user_id", uid),

          supabase.from("payments")
            .select("id, amount, bill_id, debt_id, date_iso, created_at")
            .eq("user_id", uid),

          supabase.from("ben_master_monthly").select("*").eq("user_id", uid)
            .gte("month", currentMonthStartISO())
            .order("month", { ascending: false }).limit(1).maybeSingle(),

          supabase.from("ben_master").select("*").eq("user_id", uid).maybeSingle(),

          supabase.from("profiles").select("xp, level, reputation").eq("user_id", uid).maybeSingle(),
        ]);

      if (spendRes.error)      setNotice(spendRes.error.message);
      if (billsRes.error)      setNotice(billsRes.error.message);
      if (debtsRes.error)      setNotice(debtsRes.error.message);
      if (paymentsRes.error)   setNotice(paymentsRes.error.message);
      if (monthlyRes.error)    setNotice(monthlyRes.error.message);
      if (cumulativeRes.error) setNotice(cumulativeRes.error.message);
      if (profileRes.error)    setNotice(profileRes.error.message);

      setSpend((spendRes.data         || []) as SpendRow[]);
      setBillsRows((billsRes.data     || []) as BillRow[]);
      setDebtRows((debtsRes.data      || []) as DebtRow[]);
      setPaymentsRows((paymentsRes.data || []) as PaymentRow[]);
      setMonthlyMaster((monthlyRes.data    || null) as BenMasterRow | null);
      setCumulativeMaster((cumulativeRes.data || null) as BenMasterRow | null);
      setProfile((profileRes.data     || null) as ProfileRow | null);

      if (!monthlyRes.data && !cumulativeRes.data) {
        setNotice("Add income, bills, spending, or payments to wake up the full picture.");
      }

      setLoading(false);
    }

    void loadDashboard();
  }, [supabase]);

  /* ── Derived values (unchanged) ── */
  const master = viewMode === "month"
    ? monthlyMaster ?? cumulativeMaster
    : cumulativeMaster ?? monthlyMaster;

  const totalIncome       = clampMoney(master?.total_income);
  const totalSpend        = clampMoney(master?.total_spend);
  const bills             = clampMoney(master?.bills ?? master?.total_bills);
  const totalDebt         = clampMoney(master?.total_debt);
  const totalDebtMinimums = clampMoney(master?.total_debt_minimums);
  const payments          = clampMoney(master?.payments);
  const net               = clampMoney(master?.leftover);
  const pressurePct       = clampMoney(master?.pressure_pct);
  const totalObligations  = totalSpend + bills + totalDebtMinimums;
  const incomeGap         = Math.max(0, totalObligations - totalIncome);

  const reputation = profile?.reputation ?? 0;
  const rank       = getColonialRank(reputation);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    spend.forEach(row => {
      const cat = (row.category || "misc").replaceAll("_", " ");
      totals[cat] = (totals[cat] || 0) + clampMoney(row.amount);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [spend]);

  const paidThisMonth = useMemo(() => {
    const monthStart = currentMonthStartISO();
    const byBill: Record<string, number> = {};
    const byDebt: Record<string, number> = {};
    paymentsRows.forEach(payment => {
      const date = (payment.date_iso || payment.created_at || "").slice(0, 10);
      if (!date || date < monthStart) return;
      const amount = clampMoney(payment.amount);
      if (payment.bill_id) byBill[payment.bill_id] = (byBill[payment.bill_id] || 0) + amount;
      if (payment.debt_id) byDebt[payment.debt_id] = (byDebt[payment.debt_id] || 0) + amount;
    });
    return { byBill, byDebt };
  }, [paymentsRows]);

  const priorityItems = useMemo<PriorityInput[]>(() => [
    ...billsRows.map(bill => {
      const due = billAmount(bill);
      const paid = paidThisMonth.byBill[bill.id] || 0;
      return {
        id: bill.id, type: "bill" as const, name: bill.name,
        amount: Math.max(0, due - paid),
        due_date: bill.due_date, due: bill.due, due_day: bill.due_day,
        category: bill.category, kind: bill.kind, focus: bill.focus,
        is_paid_this_month: paid >= due && due > 0,
      };
    }),
    ...debtRows.map(debt => {
      const due = debtMinimum(debt);
      const paid = paidThisMonth.byDebt[debt.id] || 0;
      return {
        id: debt.id, type: "debt" as const, name: debt.name,
        amount: Math.max(0, due - paid),
        balance: debt.balance, due_date: debt.due_date, due_day: debt.due_day,
        kind: debt.kind, apr: debt.apr,
        is_paid_this_month: paid >= due && due > 0,
      };
    }),
  ], [billsRows, debtRows, paidThisMonth]);

  const topPriorities = useMemo(() =>
    prioritizeMoneyItems(priorityItems)
      .filter(row => !row.item.is_paid_this_month && row.amount > 0)
      .slice(0, 5),
    [priorityItems]);

  const ben = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: viewMode === "month" ? "This Month" : "Cumulative",
    totalNeeded: totalObligations,
    incomeSoFar: totalIncome,
    incomeGap,
    dailyIncomeNeeded: incomeGap > 0 ? Math.ceil(incomeGap / 30) : 0,
  });

  const priorityBenText = topPriorities.length > 0
    ? `Good Governor, thy first concern appears to be ${topPriorities[0].item.name ?? "an unnamed item"} for ${money(topPriorities[0].amount)}. Reason: ${topPriorities[0].reasons.join(", ")}.`
    : ben.text;

  /* ── Loading state ── */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-ben-bank bg-cover bg-center">
        <div style={{ ...CARD, padding: "2rem 3rem", textAlign: "center" }}>
          <p className="font-cinzel text-lg animate-pulse" style={{ color: "#c9a84c" }}>
            Consulting the Treasury&hellip;
          </p>
        </div>
      </div>
    );
  }

  /* ── Pressure color helpers ── */
  const pressureColor = pressurePct > 75 || incomeGap > 0 ? "#f87171" : pressurePct > 40 ? "#f59e0b" : "#4ade80";

  return (
    <div className="min-h-screen bg-ben-bank bg-cover bg-center bg-fixed"
         style={{ fontFamily: "EB Garamond, serif" }}>
      <div className="min-h-screen pb-28" style={{ background: "rgba(10,5,2,0.72)" }}>
        <div className="mx-auto max-w-5xl px-4 py-6 space-y-5">

          {/* ── Header ── */}
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 pt-2">
            <div>
              <p className="text-xs uppercase tracking-[0.2em] font-cinzel font-semibold"
                 style={{ color: "#6b4423" }}>AskBen Command Center</p>
              <h1 className="font-cinzel text-4xl font-bold mt-1" style={{ color: "#c9a84c" }}>
                Governor&rsquo;s Office
              </h1>
              <p className="mt-1 text-sm italic" style={{ color: "#9a7d5a" }}>
                Good morrow, Governor. The Treasury awaits thy guidance.
              </p>
            </div>

            {/* Reputation badge */}
            <div className="rounded-xl px-5 py-4 text-center shrink-0"
                 style={{ background: "rgba(201,168,76,0.12)", border: "1px solid rgba(201,168,76,0.4)" }}>
              <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold"
                 style={{ color: "#9a7d5a" }}>Reputation</p>
              <p className="text-4xl font-bold font-cinzel mt-1" style={{ color: "#c9a84c" }}>
                {reputation.toLocaleString()}
              </p>
              <p className="text-xs mt-1 font-cinzel" style={{ color: "#e8d5b7" }}>{rank}</p>
            </div>
          </div>

          {/* ── Notice ── */}
          {notice && (
            <div className="rounded-xl px-4 py-3 text-sm"
                 style={{ background: "rgba(201,168,76,0.08)", border: "1px solid rgba(201,168,76,0.3)",
                          color: "#c9a84c", fontFamily: "EB Garamond, serif" }}>
              ✦ {notice}
            </div>
          )}


          {/* ── Ben&rsquo;s Desk ── */}
          <Section title="Ben's Desk" subtitle="Guidance, XP, and today's command briefing">
            <div className="grid gap-5 lg:grid-cols-[1fr_280px]">
              {/* BenBubble keeps its own styling */}
              <BenBubble message={priorityBenText} mood={ben.mood} />

              {/* XP panel */}
              <div className="rounded-xl p-4"
                   style={{ background: "rgba(107,68,35,0.15)", border: "1px solid rgba(107,68,35,0.4)" }}>
                <p className="text-[10px] uppercase tracking-widest font-cinzel font-semibold mb-3"
                   style={{ color: "#9a7d5a" }}>Ben XP</p>
                {/* Pass xp only if stored value exists, otherwise XpBar self-calculates */}
                <XpBar xp={profile?.xp || undefined} level={profile?.level || undefined} />
              </div>
            </div>

            <div className="mt-5">
              <GovernorsOrders />
            </div>
          </Section>

          {/* ── Priority Engine ── */}
          <Section
            title="Priority Engine"
            subtitle="Unpaid bills and debts ranked by urgency"
          >
            <div className="space-y-3">
              {topPriorities.length === 0 ? (
                <div className="rounded-xl px-4 py-6 text-center"
                     style={{ background: "rgba(74,138,66,0.12)", border: "1px solid rgba(74,138,66,0.3)" }}>
                  <p className="text-sm font-cinzel" style={{ color: "#4ade80" }}>
                    ✦ No unpaid priority items. Nice work, Governor.
                  </p>
                </div>
              ) : (
                topPriorities.map((row, index) => {
                  const isOverdue = row.daysUntilDue !== null && row.daysUntilDue < 0;
                  const isUrgent  = row.daysUntilDue !== null && row.daysUntilDue <= 3;
                  const borderColor = isOverdue ? "rgba(248,113,113,0.5)"
                    : isUrgent ? "rgba(245,158,11,0.5)"
                    : "rgba(107,68,35,0.4)";

                  return (
                    <div key={`${row.item.type}-${row.item.id}`}
                         className="rounded-xl p-4"
                         style={{ background: "rgba(15,8,4,0.7)", border: `1px solid ${borderColor}` }}>
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-[10px] font-cinzel font-bold uppercase tracking-widest px-2 py-0.5 rounded-full"
                                  style={{ background: "rgba(107,68,35,0.3)", color: "#9a7d5a" }}>
                              #{index + 1} {row.item.type}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] font-cinzel font-bold uppercase tracking-wide px-2 py-0.5 rounded-full"
                                    style={{ background: "rgba(248,113,113,0.15)", color: "#f87171" }}>
                                OVERDUE
                              </span>
                            )}
                          </div>
                          <h3 className="font-cinzel text-lg font-bold truncate" style={{ color: "#e8d5b7" }}>
                            {row.item.name ?? "Unnamed"}
                          </h3>
                          <p className="text-sm mt-0.5" style={{ color: isOverdue ? "#f87171" : isUrgent ? "#f59e0b" : "#9a7d5a" }}>
                            {dueLabel(row.daysUntilDue)}
                          </p>
                          <div className="mt-2 flex flex-wrap gap-1.5">
                            {row.reasons.map(reason => (
                              <span key={reason}
                                    className="text-[10px] rounded-full px-2 py-0.5"
                                    style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(107,68,35,0.3)",
                                             color: "#9a7d5a", fontFamily: "Cinzel, serif" }}>
                                {reason}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="text-left sm:text-right shrink-0">
                          <p className="font-cinzel text-2xl font-bold" style={{ color: "#c9a84c" }}>
                            {money(row.amount)}
                          </p>
                          <p className="text-[11px] mt-0.5 font-cinzel" style={{ color: "#6b4423" }}>
                            Score {row.score}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </Section>

          {/* ── Treasury Snapshot ── */}
          <Section
            title="Treasury Snapshot"
            subtitle={`Viewing ${viewMode === "month" ? "this month" : "cumulative"} totals`}
          >
            {/* View toggle */}
            <div className="flex justify-end mb-4">
              <div className="inline-flex rounded-xl p-1 gap-1"
                   style={{ background: "rgba(107,68,35,0.2)", border: "1px solid rgba(107,68,35,0.4)" }}>
                {(["month", "cumulative"] as const).map(mode => (
                  <button key={mode} type="button" onClick={() => setViewMode(mode)}
                          className="rounded-lg px-4 py-1.5 text-xs font-cinzel font-bold uppercase tracking-wide transition"
                          style={viewMode === mode
                            ? { background: "#c9a84c", color: "#1a0f0a" }
                            : { color: "#9a7d5a" }}>
                    {mode}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
              <MetricTile label="Income"  value={money(totalIncome)} />
              <MetricTile label="Spend"   value={money(totalSpend)}  />
              <MetricTile label="Debt"    value={money(totalDebt)}   accent={totalDebt > 0} />
              <MetricTile label="Net"     value={money(net)}         accent={net < 0} />
            </div>
          </Section>

          {/* ── Obligations Ledger ── */}
          <Section title="Obligations Ledger" subtitle="Bills, debt minimums, and payments made">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricTile label="Bills"          value={money(bills)}            helper="Bill targets this period" />
              <MetricTile label="Debt Minimums"  value={money(totalDebtMinimums)} helper="Required payments" />
              <MetricTile label="Payments Made"  value={money(payments)}          helper="Actual payments recorded" />
            </div>
          </Section>

          {/* ── Pressure & Warnings ── */}
          <Section title="Pressure & Warnings" subtitle="Income gap, pressure level, and spending pattern">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <MetricTile
                label="Top Spending"
                value={topCategory ? topCategory[0] : "None yet"}
                helper={topCategory ? money(topCategory[1]) : "No spending logged"}
              />
              <MetricTile
                label="Income Gap"
                value={money(incomeGap)}
                helper="Extra income needed to stay on track"
                accent={incomeGap > 0}
              />
              <div className="rounded-xl p-4 text-center"
                   style={{ background: "rgba(107,68,35,0.15)", border: "1px solid rgba(107,68,35,0.3)" }}>
                <p className="text-[10px] uppercase tracking-widest font-cinzel mb-1" style={{ color: "#9a7d5a" }}>Pressure</p>
                <p className="text-xl font-bold font-cinzel" style={{ color: pressureColor }}>
                  {pressurePct ? `${pressurePct.toFixed(1)}%` : "None yet"}
                </p>
                <p className="text-[11px] mt-1 italic" style={{ color: "#6b4423" }}>Debt pressure vs income</p>
                {/* Pressure bar */}
                {pressurePct > 0 && (
                  <div className="mt-2 h-2 rounded-full overflow-hidden"
                       style={{ background: "rgba(107,68,35,0.3)" }}>
                    <div className="h-full rounded-full transition-all duration-700"
                         style={{ width: `${Math.min(pressurePct, 100)}%`, background: pressureColor }} />
                  </div>
                )}
              </div>
            </div>
          </Section>

          {/* ── Quote footer ── */}
          <div className="rounded-xl px-6 py-4 flex items-center gap-3"
               style={{ background: "rgba(245,230,200,0.06)", border: "1px solid rgba(201,168,76,0.2)" }}>
            <span className="text-xl shrink-0">🪶</span>
            <p className="text-sm italic" style={{ color: "#c9a84c" }}>
              &ldquo;An investment in knowledge pays the best interest.&rdquo; &mdash; Benjamin Franklin
            </p>
          </div>

        </div>
      </div>
    </div>
  );
}
