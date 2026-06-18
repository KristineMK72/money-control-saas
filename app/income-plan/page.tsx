"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  DarkPanel,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  inputClass,
  moneyButtonClass,
} from "@/components/AppFrame";
import BenBubble from "@/components/BenBubble";
import ScrollRevealCard from "@/components/ScrollRevealCard";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import type { BenWeeklyRow } from "@/lib/ben/viewTypes";
import { BenEngine } from "@/lib/ben/engine";

type IncomeRow = {
  id: string;
  amount: number;
  date_iso: string;
};

type SpendRow = {
  id: string;
  amount: number;
  date_iso: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  date_iso: string;
};

type BillRow = {
  id: string;
  target: number;
  due_date: string | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
};

type DebtRow = {
  id: string;
  min_payment: number | null;
  due_date: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
};

type SideHustleRow = {
  id: string;
  user_id: string;
  name: string;
  income_type: "hourly" | "item" | "project" | "fixed";
  rate: number;
  planned_quantity: number;
  note: string | null;
  created_at: string;
};

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

function parseDateSafe(dateISO?: string | null) {
  if (!dateISO) return null;
  const d = new Date(`${dateISO}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

function getNextDueDateFromDay(dueDay?: number | null) {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = startOfToday();

  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const safeDayThisMonth = Math.min(dueDay, lastDayThisMonth);
  const thisMonthDue = new Date(year, month, safeDayThisMonth, 12, 0, 0, 0);

  if (thisMonthDue >= today) return thisMonthDue.toISOString().slice(0, 10);

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const safeDayNextMonth = Math.min(dueDay, lastDayNextMonth);
  const nextMonthDue = new Date(
    nextMonthYear,
    nextMonth,
    safeDayNextMonth,
    12,
    0,
    0,
    0
  );

  return nextMonthDue.toISOString().slice(0, 10);
}

function effectiveBillDueDate(bill: BillRow) {
  if (bill.due_date) return bill.due_date;
  if (bill.is_monthly && bill.due_day) return getNextDueDateFromDay(bill.due_day);
  return null;
}

function effectiveBillAmount(bill: BillRow) {
  return Number(bill.monthly_target || bill.target || 0);
}

function effectiveDebtDueDate(debt: DebtRow) {
  if (debt.due_date) return debt.due_date;
  if (debt.is_monthly && debt.due_day) return getNextDueDateFromDay(debt.due_day);
  return null;
}

function effectiveDebtAmount(debt: DebtRow) {
  return Number(debt.monthly_min_payment || debt.min_payment || 0);
}

function formatUSD(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const percent =
    goal <= 0 ? 100 : Math.min(100, Math.max(0, (current / goal) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-zinc-600">Goal progress</span>
        <span className="font-black text-zinc-950">{percent.toFixed(0)}%</span>
      </div>

      <div className="h-4 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${percent}%` }}
        />
      </div>
    </div>
  );
}

export default function IncomePlanPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [sideHustles, setSideHustles] = useState<SideHustleRow[]>([]);
  const [weeklySql, setWeeklySql] = useState<BenWeeklyRow | null>(null);

  const [name, setName] = useState("");
  const [incomeType, setIncomeType] = useState<
    "hourly" | "item" | "project" | "fixed"
  >("hourly");
  const [rate, setRate] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [note, setNote] = useState("");

  async function refreshSideHustles(uid = userId) {
    if (!uid) return;

    const { data, error } = await supabase
      .from("side_hustles")
      .select("*")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setSideHustles((data || []) as SideHustleRow[]);
  }

  useEffect(() => {
    async function loadPage() {
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
        setMessage("Please log in to view your income plan.");
        setLoading(false);
        return;
      }

      const uid = session.user.id;
      setUserId(uid);

      const [
        incomeRes,
        spendRes,
        paymentsRes,
        billsRes,
        debtsRes,
        hustlesRes,
        weeklyRes,
      ] = await Promise.all([
        supabase
          .from("income_entries")
          .select("id, amount, date_iso")
          .eq("user_id", uid),

        supabase
          .from("spend_entries")
          .select("id, amount, date_iso")
          .eq("user_id", uid),

        supabase
          .from("payments")
          .select("id, amount, date_iso")
          .eq("user_id", uid),

        supabase
          .from("bills")
          .select("id, target, due_date, is_monthly, monthly_target, due_day")
          .eq("user_id", uid),

        supabase
          .from("debts")
          .select(
            "id, min_payment, due_date, is_monthly, due_day, monthly_min_payment"
          )
          .eq("user_id", uid),

        supabase
          .from("side_hustles")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),

        supabase.from("ben_weekly").select("*").eq("user_id", uid).maybeSingle(),
      ]);

      if (incomeRes.error) setMessage(incomeRes.error.message);
      if (spendRes.error) setMessage(spendRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);
      if (billsRes.error) setMessage(billsRes.error.message);
      if (debtsRes.error) setMessage(debtsRes.error.message);
      if (hustlesRes.error) setMessage(hustlesRes.error.message);

      setIncomeEntries((incomeRes.data || []) as IncomeRow[]);
      setSpendEntries((spendRes.data || []) as SpendRow[]);
      setPaymentEntries((paymentsRes.data || []) as PaymentRow[]);
      setBills((billsRes.data || []) as BillRow[]);
      setDebts((debtsRes.data || []) as DebtRow[]);
      setSideHustles((hustlesRes.data || []) as SideHustleRow[]);
      setWeeklySql(!weeklyRes.error && weeklyRes.data ? (weeklyRes.data as BenWeeklyRow) : null);

      setLoading(false);
    }

    void loadPage();
  }, [supabase]);

  async function handleAddSideHustle() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const parsedRate = Number(rate);
    const parsedQty = Number(plannedQuantity);

    if (
      !name.trim() ||
      !Number.isFinite(parsedRate) ||
      parsedRate < 0 ||
      !Number.isFinite(parsedQty) ||
      parsedQty < 0
    ) {
      setMessage("Please enter a name, rate, and planned quantity.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("side_hustles").insert({
      user_id: userId,
      name: name.trim(),
      income_type: incomeType,
      rate: parsedRate,
      planned_quantity: parsedQty,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setIncomeType("hourly");
    setRate("");
    setPlannedQuantity("");
    setNote("");
    setMessage("Income option added. Ben has updated the plan.");

    await refreshSideHustles(userId);
    setSaving(false);
  }

  async function handleDeleteSideHustle(id: string) {
    setMessage("");

    if (!userId) return;

    const { error } = await supabase
      .from("side_hustles")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSideHustles((prev) => prev.filter((row) => row.id !== id));
  }

  const weekEnd = useMemo(() => endOfWindow(6), []);

  const totalIncome = useMemo(
    () => incomeEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [incomeEntries]
  );

  const totalSpending = useMemo(
    () => spendEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [spendEntries]
  );

  const totalPayments = useMemo(
    () => paymentEntries.reduce((sum, row) => sum + Number(row.amount || 0), 0),
    [paymentEntries]
  );

  const billsThisWeekTotal = useMemo(() => {
    return bills
      .map((bill) => ({
        dueDate: effectiveBillDueDate(bill),
        amount: effectiveBillAmount(bill),
      }))
      .filter((bill) => {
        const due = parseDateSafe(bill.dueDate);
        return due && due <= weekEnd;
      })
      .reduce((sum, bill) => sum + bill.amount, 0);
  }, [bills, weekEnd]);

  const debtThisWeekTotal = useMemo(() => {
    return debts
      .map((debt) => ({
        dueDate: effectiveDebtDueDate(debt),
        amount: effectiveDebtAmount(debt),
      }))
      .filter((debt) => {
        const due = parseDateSafe(debt.dueDate);
        return due && due <= weekEnd;
      })
      .reduce((sum, debt) => sum + debt.amount, 0);
  }, [debts, weekEnd]);

  const gapThisWeekClient = Math.max(
    0,
    billsThisWeekTotal + debtThisWeekTotal + totalSpending + totalPayments - totalIncome
  );

  const gapThisWeek =
    weeklySql != null ? Math.max(0, Number(weeklySql.gap_week)) : gapThisWeekClient;

  const plannedIncome = useMemo(() => {
    return sideHustles.reduce(
      (sum, row) => sum + Number(row.rate || 0) * Number(row.planned_quantity || 0),
      0
    );
  }, [sideHustles]);

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);
  const overGoal = Math.max(0, plannedIncome - gapThisWeek);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income Plan",
    totalNeeded: gapThisWeek,
    incomeSoFar: plannedIncome,
    incomeGap: remainingGap,
    dailyIncomeNeeded: Math.ceil(remainingGap / 7),
  });

  const planMood =
    remainingGap <= 0 && gapThisWeek > 0
      ? "/ben-winning.png"
      : remainingGap > 0
      ? "/ben-mastermind.png"
      : "/ben-thinking.png";

  if (loading) {
    return (
      <AppShell max="max-w-6xl">
        <Panel>Loading income plan...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell max="max-w-6xl">
      <PageHeader
        eyebrow="Income Strategy"
        title="Close the Gap"
        subtitle="Add side hustle options and see whether your plan covers this week's shortfall."
        action={
          <div className="flex flex-wrap gap-2">
            <a href="/dashboard" className={moneyButtonClass}>
              Dashboard
            </a>
            <a href="/forecast" className={moneyButtonClass}>
              Forecast
            </a>
          </div>
        }
      />

      {message ? <Notice>{message}</Notice> : null}

      <ScrollRevealCard
        title="Income Strategy Briefing"
        subtitle="Weekly gap, planned income, and Ben's recommendation"
        image={planMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
          <MetricCard label="Gap this week" value={formatUSD(gapThisWeek)} tone="rose" />
          <MetricCard label="Planned income" value={formatUSD(plannedIncome)} tone="emerald" />
          <MetricCard label="Remaining gap" value={formatUSD(remainingGap)} tone={remainingGap > 0 ? "rose" : "emerald"} />
          <MetricCard label="Over goal" value={formatUSD(overGoal)} tone="sky" />
          <MetricCard
            label="Status"
            value={
              remainingGap <= 0 && gapThisWeek > 0
                ? "Covered"
                : gapThisWeek === 0
                ? "No gap"
                : "Needs work"
            }
            tone={remainingGap <= 0 ? "emerald" : "amber"}
          />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Add Income Option"
        subtitle="DoorDash, tips, freelance, sales, projects, or extra shifts"
        image="/ben-thinking.png"
        defaultOpen
      >
        <div className="grid gap-3">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={inputClass}
          />

          <select
            value={incomeType}
            onChange={(e) =>
              setIncomeType(e.target.value as "hourly" | "item" | "project" | "fixed")
            }
            className={inputClass}
          >
            <option value="hourly">Hourly</option>
            <option value="item">Per item</option>
            <option value="project">Per project</option>
            <option value="fixed">Fixed amount</option>
          </select>

          <input
            placeholder={
              incomeType === "hourly"
                ? "Rate per hour"
                : incomeType === "item"
                ? "Profit per item"
                : incomeType === "project"
                ? "Income per project"
                : "Fixed amount"
            }
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />

          <input
            placeholder={
              incomeType === "hourly"
                ? "Planned hours"
                : incomeType === "item"
                ? "Planned items"
                : incomeType === "project"
                ? "Planned projects"
                : "How many times"
            }
            type="number"
            inputMode="decimal"
            value={plannedQuantity}
            onChange={(e) => setPlannedQuantity(e.target.value)}
            className={inputClass}
          />

          <input
            placeholder="Note optional"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />

          <button
            onClick={handleAddSideHustle}
            disabled={saving || !userId}
            className={moneyButtonClass}
          >
            {saving ? "Saving..." : "Add Income Option"}
          </button>
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Progress Toward Goal"
        subtitle="How much of this week's gap your plan covers"
        image="/ben-recovery.png"
        defaultOpen
      >
        <ProgressBar current={plannedIncome} goal={gapThisWeek} />

        <div className="mt-6 grid gap-3">
          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4">
            <span className="font-bold text-zinc-600">Gap this week</span>
            <span className="font-black text-zinc-950">{formatUSD(gapThisWeek)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl border border-zinc-200 bg-white p-4">
            <span className="font-bold text-zinc-600">Planned income</span>
            <span className="font-black text-zinc-950">{formatUSD(plannedIncome)}</span>
          </div>

          <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
            <span className="font-bold text-emerald-700">Remaining</span>
            <span className="font-black text-emerald-700">{formatUSD(remainingGap)}</span>
          </div>
        </div>

        <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-bold leading-6 text-zinc-700">
          {gapThisWeek === 0
            ? "You currently have no weekly gap based on your entries."
            : remainingGap === 0
            ? "Your current income plan covers the full gap."
            : `Your plan does not fully cover the gap yet. You still need ${formatUSD(
                remainingGap
              )}.`}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Income Plan"
        subtitle={`${sideHustles.length} income option${
          sideHustles.length === 1 ? "" : "s"
        } in the ledger`}
        image="/ben-mastermind.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {sideHustles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600 shadow-sm">
              No income options added yet.
            </div>
          ) : (
            sideHustles.map((row) => {
              const projected =
                Number(row.rate || 0) * Number(row.planned_quantity || 0);

              return (
                <div
                  key={row.id}
                  className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="font-black text-zinc-950">{row.name}</div>
                    <div className="text-sm font-semibold text-zinc-600">
                      {formatUSD(Number(row.rate || 0))} ×{" "}
                      {Number(row.planned_quantity || 0)} · {row.income_type}
                      {row.note ? ` · ${row.note}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-black text-emerald-800">
                      {formatUSD(projected)}
                    </div>

                    <button
                      onClick={() => void handleDeleteSideHustle(row.id)}
                      className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </ScrollRevealCard>
    </AppShell>
  );
}
