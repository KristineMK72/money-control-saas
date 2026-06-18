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

type IncomeType = "hourly" | "item" | "project" | "fixed";

type IncomeRow = {
  id: string;
  amount: number | string | null;
  date_iso: string;
};

type SpendRow = {
  id: string;
  amount: number | string | null;
  date_iso: string;
};

type PaymentRow = {
  id: string;
  amount: number | string | null;
  date_iso: string;
};

type BillRow = {
  id: string;
  target: number | string | null;
  due_date: string | null;
  is_monthly: boolean | null;
  monthly_target: number | string | null;
  due_day: number | null;
};

type DebtRow = {
  id: string;
  min_payment: number | string | null;
  due_date: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | string | null;
};

type SideHustleRow = {
  id: string;
  user_id: string;
  name: string;
  income_type: IncomeType;
  rate: number | string | null;
  planned_quantity: number | string | null;
  note: string | null;
  created_at: string;
};

type Template = {
  name: string;
  income_type: IncomeType;
  rate: number;
  planned_quantity: number;
  note: string;
};

const templates: Template[] = [
  { name: "DoorDash", income_type: "hourly", rate: 20, planned_quantity: 5, note: "Quick cash shift" },
  { name: "Beauty Service", income_type: "project", rate: 75, planned_quantity: 1, note: "Service appointment" },
  { name: "Hair Color", income_type: "project", rate: 120, planned_quantity: 1, note: "High-value service" },
  { name: "Haircut", income_type: "project", rate: 40, planned_quantity: 1, note: "Quick service" },
  { name: "Marketplace Sale", income_type: "item", rate: 25, planned_quantity: 3, note: "Sell unused items" },
  { name: "Overtime Shift", income_type: "hourly", rate: 22, planned_quantity: 4, note: "Extra hours" },
  { name: "Freelance Project", income_type: "project", rate: 150, planned_quantity: 1, note: "One project" },
];

function safeNum(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function formatUSD(value: unknown) {
  return safeNum(value).toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

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
  const thisMonthDue = new Date(year, month, Math.min(dueDay, lastDayThisMonth), 12);

  if (thisMonthDue >= today) return thisMonthDue.toISOString().slice(0, 10);

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();

  return new Date(nextMonthYear, nextMonth, Math.min(dueDay, lastDayNextMonth), 12)
    .toISOString()
    .slice(0, 10);
}

function effectiveBillDueDate(bill: BillRow) {
  if (bill.due_date) return bill.due_date;
  if (bill.is_monthly && bill.due_day) return getNextDueDateFromDay(bill.due_day);
  return null;
}

function effectiveDebtDueDate(debt: DebtRow) {
  if (debt.due_date) return debt.due_date;
  if (debt.is_monthly && debt.due_day) return getNextDueDateFromDay(debt.due_day);
  return null;
}

function getWeeklyGapFromView(weeklySql: BenWeeklyRow | null) {
  if (!weeklySql) return 0;
  const row = weeklySql as Record<string, unknown>;

  return Math.max(
    0,
    safeNum(row.gap_week ?? row.week_gap ?? row.income_gap ?? row.gap ?? row.total_gap ?? 0)
  );
}

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const percent = goal <= 0 ? 100 : Math.min(100, Math.max(0, (current / goal) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="font-bold text-zinc-600">Goal progress</span>
        <span className="font-black text-zinc-950">{percent.toFixed(0)}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-zinc-200">
        <div className="h-full rounded-full bg-emerald-500 transition-all" style={{ width: `${percent}%` }} />
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
  const [incomeType, setIncomeType] = useState<IncomeType>("hourly");
  const [rate, setRate] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [note, setNote] = useState("");

  const [simRate, setSimRate] = useState("20");
  const [simQty, setSimQty] = useState("5");

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

      const user = data.session?.user;

      if (!user) {
        setMessage("Please log in to view your income plan.");
        setLoading(false);
        return;
      }

      const uid = user.id;
      setUserId(uid);

      const [incomeRes, spendRes, paymentsRes, billsRes, debtsRes, hustlesRes, weeklyRes] =
        await Promise.all([
          supabase.from("income_entries").select("id, amount, date_iso").eq("user_id", uid),
          supabase.from("spend_entries").select("id, amount, date_iso").eq("user_id", uid),
          supabase.from("payments").select("id, amount, date_iso").eq("user_id", uid),
          supabase.from("bills").select("id, target, due_date, is_monthly, monthly_target, due_day").eq("user_id", uid),
          supabase.from("debts").select("id, min_payment, due_date, is_monthly, due_day, monthly_min_payment").eq("user_id", uid),
          supabase.from("side_hustles").select("*").eq("user_id", uid).order("created_at", { ascending: false }),
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

  function applyTemplate(template: Template) {
    setName(template.name);
    setIncomeType(template.income_type);
    setRate(String(template.rate));
    setPlannedQuantity(String(template.planned_quantity));
    setNote(template.note);
    setMessage(`${template.name} loaded. Adjust it or save it to the plan.`);
  }

  async function handleAddSideHustle() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const parsedRate = safeNum(rate);
    const parsedQty = safeNum(plannedQuantity);

    if (!name.trim() || parsedRate <= 0 || parsedQty <= 0) {
      setMessage("Please enter a name, rate, and planned quantity above zero.");
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
    () => incomeEntries.reduce((sum, row) => sum + safeNum(row.amount), 0),
    [incomeEntries]
  );

  const totalSpending = useMemo(
    () => spendEntries.reduce((sum, row) => sum + safeNum(row.amount), 0),
    [spendEntries]
  );

  const totalPayments = useMemo(
    () => paymentEntries.reduce((sum, row) => sum + safeNum(row.amount), 0),
    [paymentEntries]
  );

  const billsThisWeekTotal = useMemo(() => {
    return bills
      .map((bill) => ({
        dueDate: effectiveBillDueDate(bill),
        amount: safeNum(bill.monthly_target || bill.target),
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
        amount: safeNum(debt.monthly_min_payment || debt.min_payment),
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

  const weeklyGapValue = getWeeklyGapFromView(weeklySql);
  const gapThisWeek = weeklyGapValue > 0 ? weeklyGapValue : gapThisWeekClient;

  const plannedIncome = useMemo(() => {
    return sideHustles.reduce(
      (sum, row) => sum + safeNum(row.rate) * safeNum(row.planned_quantity),
      0
    );
  }, [sideHustles]);

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);
  const overGoal = Math.max(0, plannedIncome - gapThisWeek);
  const simProjected = safeNum(simRate) * safeNum(simQty);
  const simRemaining = Math.max(0, remainingGap - simProjected);

  const sortedOpportunities = useMemo(() => {
    return [...sideHustles]
      .map((row) => ({
        ...row,
        projected: safeNum(row.rate) * safeNum(row.planned_quantity),
        rateValue: safeNum(row.rate),
      }))
      .sort((a, b) => b.rateValue - a.rateValue);
  }, [sideHustles]);

  const recommendedPath = useMemo(() => {
    let need = gapThisWeek;
    const picks: { name: string; projected: number }[] = [];

    for (const row of sortedOpportunities) {
      if (need <= 0) break;
      const projected = row.projected;
      if (projected <= 0) continue;
      picks.push({ name: row.name, projected });
      need -= projected;
    }

    return {
      picks,
      remaining: Math.max(0, need),
    };
  }, [gapThisWeek, sortedOpportunities]);

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
        subtitle="Plan the fastest path to cover this week's shortfall."
        action={
          <div className="flex flex-wrap gap-2">
            <a href="/dashboard" className={moneyButtonClass}>Dashboard</a>
            <a href="/forecast" className={moneyButtonClass}>Forecast</a>
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
            value={remainingGap <= 0 && gapThisWeek > 0 ? "Covered" : gapThisWeek === 0 ? "No gap" : "Needs work"}
            tone={remainingGap <= 0 ? "emerald" : "amber"}
          />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Ben's Fastest Path"
        subtitle="A practical plan using your saved income options"
        image="/ben-mastermind.png"
        defaultOpen
      >
        {gapThisWeek === 0 ? (
          <p className="font-bold text-zinc-700">No weekly gap detected. The Treasury is quiet for now.</p>
        ) : recommendedPath.picks.length === 0 ? (
          <p className="font-bold text-zinc-700">Add income options below and Ben will build a fastest path.</p>
        ) : (
          <div className="grid gap-3">
            {recommendedPath.picks.map((pick) => (
              <div key={pick.name} className="rounded-2xl border border-zinc-200 bg-white p-4">
                <p className="font-black text-zinc-950">{pick.name}</p>
                <p className="text-sm font-bold text-zinc-600">{formatUSD(pick.projected)} projected</p>
              </div>
            ))}

            <div className="rounded-2xl bg-emerald-50 p-4 font-black text-emerald-800">
              {recommendedPath.remaining <= 0
                ? "Treasury secured. This plan covers the gap."
                : `${formatUSD(recommendedPath.remaining)} still uncovered.`}
            </div>
          </div>
        )}
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Quick Income Templates"
        subtitle="Tap one to load the form"
        image="/ben-thinking.png"
      >
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {templates.map((template) => (
            <button
              key={template.name}
              type="button"
              onClick={() => applyTemplate(template)}
              className="rounded-2xl border border-zinc-200 bg-white p-4 text-left shadow-sm transition hover:bg-amber-50"
            >
              <p className="font-black text-zinc-950">{template.name}</p>
              <p className="text-sm font-bold text-zinc-600">
                {formatUSD(template.rate)} × {template.planned_quantity}
              </p>
              <p className="mt-1 text-xs font-bold text-zinc-500">{template.note}</p>
            </button>
          ))}
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Add Income Option"
        subtitle="DoorDash, tips, freelance, sales, projects, or extra shifts"
        image="/ben-thinking.png"
        defaultOpen
      >
        <div className="grid gap-3">
          <input placeholder="Name" value={name} onChange={(e) => setName(e.target.value)} className={inputClass} />

          <select value={incomeType} onChange={(e) => setIncomeType(e.target.value as IncomeType)} className={inputClass}>
            <option value="hourly">Hourly</option>
            <option value="item">Per item</option>
            <option value="project">Per project</option>
            <option value="fixed">Fixed amount</option>
          </select>

          <input
            placeholder={incomeType === "hourly" ? "Rate per hour" : incomeType === "item" ? "Profit per item" : incomeType === "project" ? "Income per project" : "Fixed amount"}
            type="number"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            className={inputClass}
          />

          <input
            placeholder={incomeType === "hourly" ? "Planned hours" : incomeType === "item" ? "Planned items" : incomeType === "project" ? "Planned projects" : "How many times"}
            type="number"
            inputMode="decimal"
            value={plannedQuantity}
            onChange={(e) => setPlannedQuantity(e.target.value)}
            className={inputClass}
          />

          <input placeholder="Note optional" value={note} onChange={(e) => setNote(e.target.value)} className={inputClass} />

          <button onClick={handleAddSideHustle} disabled={saving || !userId} className={moneyButtonClass}>
            {saving ? "Saving..." : "Add Income Option"}
          </button>
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="What-If Simulator"
        subtitle="Test income without saving it"
        image="/ben-recovery.png"
      >
        <div className="grid gap-3 md:grid-cols-2">
          <input value={simRate} onChange={(e) => setSimRate(e.target.value)} className={inputClass} placeholder="Rate" inputMode="decimal" />
          <input value={simQty} onChange={(e) => setSimQty(e.target.value)} className={inputClass} placeholder="Quantity" inputMode="decimal" />
        </div>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard label="Projected" value={formatUSD(simProjected)} tone="emerald" />
          <MetricCard label="Remaining after this" value={formatUSD(simRemaining)} tone={simRemaining > 0 ? "rose" : "emerald"} />
          <MetricCard label="Status" value={simRemaining <= 0 ? "Covers gap" : "Still short"} tone={simRemaining <= 0 ? "emerald" : "amber"} />
        </section>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Weekly Mission"
        subtitle="Turn the gap into one clear action"
        image="/ben-winning.png"
        defaultOpen
      >
        <ProgressBar current={plannedIncome} goal={gapThisWeek} />

        <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5">
          <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
            Governor&apos;s Mission
         </p>
          <p className="mt-2 text-2xl font-black text-emerald-950">
            Earn {formatUSD(Math.max(0, remainingGap))} before the week ends.
          </p>
          <p className="mt-2 text-sm font-bold text-emerald-800">
            Reward idea: Treasury Stability +25 when the gap is covered.
          </p>
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Income Plan"
        subtitle={`${sideHustles.length} income option${sideHustles.length === 1 ? "" : "s"} in the ledger`}
        image="/ben-mastermind.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {sideHustles.length === 0 ? (
            <div className="rounded-2xl border border-zinc-200 bg-white p-4 text-sm font-semibold text-zinc-600 shadow-sm">
              No income options added yet.
            </div>
          ) : (
            sortedOpportunities.map((row) => (
              <div key={row.id} className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between">
                <div>
                  <div className="font-black text-zinc-950">{row.name}</div>
                  <div className="text-sm font-semibold text-zinc-600">
                    {formatUSD(row.rate)} × {safeNum(row.planned_quantity)} · {row.income_type}
                    {row.note ? ` · ${row.note}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="font-black text-emerald-800">{formatUSD(row.projected)}</div>
                  <button
                    onClick={() => void handleDeleteSideHustle(row.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollRevealCard>
    </AppShell>
  );
}
