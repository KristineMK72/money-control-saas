"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { money, addMoney, clampMoney } from "@/lib/money/math";
import { todayLocalISO, currentMonthStartISO } from "@/lib/money/dates";
import { BenEngine } from "@/lib/ben/engine";
import type { BenWeeklyRow } from "@/lib/ben/viewTypes";
import { playCoins, playError } from "@/lib/sounds";

const INCOME_BG = "/7EBFF32F-5F7B-43FE-A55C-3E277E603F4B.png";

type IncomeType = "hourly" | "item" | "project" | "fixed";

type IncomeEntry = {
  id: string;
  user_id: string;
  amount: number | string | null;
  category?: string | null;
  source?: string | null;
  hours_worked?: number | string | null;
  hourly_rate?: number | string | null;
  date_iso?: string | null;
  received_on?: string | null;
  created_at: string;
};

type SpendRow = { id: string; amount: number | string | null; date_iso: string };
type PaymentRow = { id: string; amount: number | string | null; date_iso: string };

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

const CATEGORIES = [
  { value: "employment", label: "Employment", icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services", label: "Services", icon: "📋" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "gifts", label: "Gifts", icon: "🎁" },
  { value: "other", label: "Other", icon: "💰" },
];

const templates = [
  { name: "DoorDash", income_type: "hourly" as const, rate: 20, planned_quantity: 5, note: "Quick cash shift" },
  { name: "Beauty Service", income_type: "project" as const, rate: 75, planned_quantity: 1, note: "Service appointment" },
  { name: "Hair Color", income_type: "project" as const, rate: 120, planned_quantity: 1, note: "High-value service" },
  { name: "Haircut", income_type: "project" as const, rate: 40, planned_quantity: 1, note: "Quick service" },
  { name: "Marketplace Sale", income_type: "item" as const, rate: 25, planned_quantity: 3, note: "Sell unused items" },
  { name: "Overtime Shift", income_type: "hourly" as const, rate: 22, planned_quantity: 4, note: "Extra hours" },
  { name: "Freelance Project", income_type: "project" as const, rate: 150, planned_quantity: 1, note: "One project" },
];

function safeNum(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function entryDateStr(e: IncomeEntry) {
  return (e.date_iso || e.received_on || e.created_at || "").slice(0, 10);
}

function monthPrefix(s: string) {
  return s.slice(0, 7);
}

function getCategoryInfo(cat?: string | null) {
  return CATEGORIES.find((c) => c.value === (cat || "").toLowerCase()) ?? {
    label: "Income",
    icon: "💰",
  };
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

function RoomCard({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl p-4 ${className}`}
      style={{
        background: "rgba(6,4,3,.78)",
        border: "1px solid rgba(201,168,76,.34)",
        backdropFilter: "blur(8px)",
      }}
    >
      {children}
    </div>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="mb-1 text-[10px] font-bold uppercase tracking-[0.2em]"
      style={{ color: "#c9a84c" }}
    >
      {children}
    </p>
  );
}

function MiniMetric({
  icon,
  label,
  value,
  good,
  danger,
}: {
  icon: string;
  label: string;
  value: string;
  good?: boolean;
  danger?: boolean;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: "rgba(0,0,0,.56)",
        border: "1px solid rgba(201,168,76,.25)",
      }}
    >
      <div className="text-2xl">{icon}</div>
      <p className="mt-1 text-[10px] uppercase tracking-widest text-[#d6c09a]">
        {label}
      </p>
      <p
        className="mt-1 text-xl font-black"
        style={{ color: danger ? "#f87171" : good ? "#4ade80" : "#c9a84c" }}
      >
        {value}
      </p>
    </div>
  );
}

export default function IncomePage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [sideHustles, setSideHustles] = useState<SideHustleRow[]>([]);
  const [weeklySql, setWeeklySql] = useState<BenWeeklyRow | null>(null);

  const [message, setMessage] = useState("");
  const [showAddIncome, setShowAddIncome] = useState(false);
  const [showPlan, setShowPlan] = useState(false);
  const [emergencyMode, setEmergencyMode] = useState(false);

  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("employment");
  const [source, setSource] = useState("");
  const [hoursWorked, setHoursWorked] = useState("");
  const [date, setDate] = useState(todayLocalISO());

  const [name, setName] = useState("");
  const [incomeType, setIncomeType] = useState<IncomeType>("hourly");
  const [rate, setRate] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [note, setNote] = useState("");

  const [simRate, setSimRate] = useState("20");
  const [simQty, setSimQty] = useState("5");

  useEffect(() => {
    void loadData();
  }, []);

  async function loadData() {
    setLoading(true);
    setMessage("");

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setLoading(false);
      return;
    }

    setUserId(user.id);

    const [incomeRes, spendRes, paymentsRes, billsRes, debtsRes, hustlesRes, weeklyRes] =
      await Promise.all([
        supabase
          .from("income_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase.from("spend_entries").select("id, amount, date_iso").eq("user_id", user.id),

        supabase.from("payments").select("id, amount, date_iso").eq("user_id", user.id),

        supabase
          .from("bills")
          .select("id, target, due_date, is_monthly, monthly_target, due_day")
          .eq("user_id", user.id),

        supabase
          .from("debts")
          .select("id, min_payment, due_date, is_monthly, due_day, monthly_min_payment")
          .eq("user_id", user.id),

        supabase
          .from("side_hustles")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase.from("ben_weekly").select("*").eq("user_id", user.id).maybeSingle(),
      ]);

    if (incomeRes.error) setMessage(incomeRes.error.message);
    if (spendRes.error) setMessage(spendRes.error.message);
    if (paymentsRes.error) setMessage(paymentsRes.error.message);
    if (billsRes.error) setMessage(billsRes.error.message);
    if (debtsRes.error) setMessage(debtsRes.error.message);
    if (hustlesRes.error) setMessage(hustlesRes.error.message);

    setEntries((incomeRes.data || []) as IncomeEntry[]);
    setSpendEntries((spendRes.data || []) as SpendRow[]);
    setPaymentEntries((paymentsRes.data || []) as PaymentRow[]);
    setBills((billsRes.data || []) as BillRow[]);
    setDebts((debtsRes.data || []) as DebtRow[]);
    setSideHustles((hustlesRes.data || []) as SideHustleRow[]);
    setWeeklySql(!weeklyRes.error && weeklyRes.data ? (weeklyRes.data as BenWeeklyRow) : null);

    setLoading(false);
  }

  async function handleAddIncome() {
    setMessage("");

    const amt = clampMoney(amount);
    const hrs = clampMoney(hoursWorked);

    if (amt <= 0) {
      playError();
      setMessage("Enter a valid income amount.");
      return;
    }

    if (!userId) {
      setMessage("Not signed in.");
      return;
    }

    setSaving(true);

    const hourlyRate = hrs > 0 ? clampMoney(amt / hrs) : null;

    const { error } = await supabase.from("income_entries").insert({
      user_id: userId,
      amount: amt,
      category,
      source: source.trim() || null,
      hours_worked: hrs || null,
      hourly_rate: hourlyRate,
      date_iso: date,
    });

    setSaving(false);

    if (error) {
      playError();
      setMessage(error.message);
      return;
    }

    playCoins();
    setAmount("");
    setSource("");
    setHoursWorked("");
    setShowAddIncome(false);
    setMessage("Income recorded in Franklin's ledger.");
    await loadData();
  }

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

  async function handleAddSideHustle() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const parsedRate = clampMoney(rate);
    const parsedQty = clampMoney(plannedQuantity);

    if (!name.trim() || parsedRate <= 0 || parsedQty <= 0) {
      playError();
      setMessage("Enter a name, rate, and quantity above zero.");
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

    setSaving(false);

    if (error) {
      playError();
      setMessage(error.message);
      return;
    }

    playCoins();
    setName("");
    setIncomeType("hourly");
    setRate("");
    setPlannedQuantity("");
    setNote("");
    setMessage("Income option added. Ben updated the plan.");
    await refreshSideHustles(userId);
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

  function applyTemplate(template: (typeof templates)[number]) {
    setName(template.name);
    setIncomeType(template.income_type);
    setRate(String(template.rate));
    setPlannedQuantity(String(template.planned_quantity));
    setNote(template.note);
    setShowPlan(true);
    setMessage(`${template.name} loaded. Adjust it or save it.`);
  }

  const thisMonthStr = monthPrefix(currentMonthStartISO());

  const lastMonthStr = useMemo(() => {
    const [y, m] = thisMonthStr.split("-").map(Number);
    const lm = m === 1 ? 12 : m - 1;
    const ly = m === 1 ? y - 1 : y;
    return `${ly}-${String(lm).padStart(2, "0")}`;
  }, [thisMonthStr]);

  const thisMonthTotal = useMemo(
    () =>
      addMoney(
        entries
          .filter((e) => monthPrefix(entryDateStr(e)) === thisMonthStr)
          .map((e) => e.amount)
      ),
    [entries, thisMonthStr]
  );

  const lastMonthTotal = useMemo(
    () =>
      addMoney(
        entries
          .filter((e) => monthPrefix(entryDateStr(e)) === lastMonthStr)
          .map((e) => e.amount)
      ),
    [entries, lastMonthStr]
  );

  const allTimeTotal = useMemo(() => addMoney(entries.map((e) => e.amount)), [entries]);

  const avgMonthly = useMemo(() => {
    if (!entries.length) return 0;
    const months = new Set(entries.map((e) => monthPrefix(entryDateStr(e))));
    return clampMoney(allTimeTotal / Math.max(months.size, 1));
  }, [entries, allTimeTotal]);

  const avgHourly = useMemo(() => {
    const hourlyEntries = entries
      .map((e) => ({
        amount: clampMoney(e.amount),
        hours: clampMoney(e.hours_worked),
      }))
      .filter((e) => e.amount > 0 && e.hours > 0);

    const totalAmt = addMoney(hourlyEntries.map((e) => e.amount));
    const totalHours = addMoney(hourlyEntries.map((e) => e.hours));

    return totalHours > 0 ? clampMoney(totalAmt / totalHours) : 0;
  }, [entries]);

  const highestMonth = useMemo(() => {
    const byMonth = new Map<string, { total: number; label: string }>();

    entries.forEach((e) => {
      const key = monthPrefix(entryDateStr(e));
      const [y, m] = key.split("-").map(Number);
      const label = new Date(y, m - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const cur = byMonth.get(key) || { total: 0, label };
      byMonth.set(key, { total: addMoney([cur.total, e.amount]), label });
    });

    let best = { total: 0, label: "—" };
    byMonth.forEach((v) => {
      if (v.total > best.total) best = v;
    });

    return best;
  }, [entries]);

  const sourcesCount = useMemo(
    () => new Set(entries.map((e) => e.source || e.category || "other")).size,
    [entries]
  );

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, i) => {
      const [y, m] = thisMonthStr.split("-").map(Number);
      const raw = m - (5 - i);
      const adjM = ((raw - 1 + 12) % 12) + 1;
      const adjY = y + Math.floor((raw - 1) / 12);
      const key = `${adjY}-${String(adjM).padStart(2, "0")}`;

      return {
        month: new Date(adjY, adjM - 1, 1).toLocaleDateString("en-US", {
          month: "short",
        }),
        total: addMoney(
          entries.filter((e) => monthPrefix(entryDateStr(e)) === key).map((e) => e.amount)
        ),
        current: i === 5,
      };
    });
  }, [entries, thisMonthStr]);

  const weekEnd = useMemo(() => endOfWindow(6), []);

  const totalSpending = useMemo(
    () => addMoney(spendEntries.map((row) => row.amount)),
    [spendEntries]
  );

  const totalPayments = useMemo(
    () => addMoney(paymentEntries.map((row) => row.amount)),
    [paymentEntries]
  );

  const billsThisWeekTotal = useMemo(() => {
    return addMoney(
      bills
        .map((bill) => ({
          dueDate: effectiveBillDueDate(bill),
          amount: clampMoney(bill.monthly_target || bill.target),
        }))
        .filter((bill) => {
          const due = parseDateSafe(bill.dueDate);
          return due && due <= weekEnd;
        })
        .map((bill) => bill.amount)
    );
  }, [bills, weekEnd]);

  const debtThisWeekTotal = useMemo(() => {
    return addMoney(
      debts
        .map((debt) => ({
          dueDate: effectiveDebtDueDate(debt),
          amount: clampMoney(debt.monthly_min_payment || debt.min_payment),
        }))
        .filter((debt) => {
          const due = parseDateSafe(debt.dueDate);
          return due && due <= weekEnd;
        })
        .map((debt) => debt.amount)
    );
  }, [debts, weekEnd]);

  const gapThisWeekClient = Math.max(
    0,
    billsThisWeekTotal + debtThisWeekTotal + totalSpending + totalPayments - thisMonthTotal
  );

  const weeklyGapValue = getWeeklyGapFromView(weeklySql);
  const gapThisWeek = weeklyGapValue > 0 ? weeklyGapValue : gapThisWeekClient;

  const plannedIncome = useMemo(
    () =>
      addMoney(
        sideHustles.map((row) => clampMoney(row.rate) * clampMoney(row.planned_quantity))
      ),
    [sideHustles]
  );

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);
  const overGoal = Math.max(0, plannedIncome - gapThisWeek);

  const monthlyNeed = useMemo(() => {
    const monthlyBills = addMoney(bills.map((b) => clampMoney(b.monthly_target || b.target)));
    const monthlyDebt = addMoney(
      debts.map((d) => clampMoney(d.monthly_min_payment || d.min_payment))
    );
    return monthlyBills + monthlyDebt + totalSpending;
  }, [bills, debts, totalSpending]);

  const weeklyNeed = clampMoney(monthlyNeed / 4.33);
  const dailyNeed = clampMoney(monthlyNeed / 30);
  const hourlyNeeded40 = clampMoney(weeklyNeed / 40);
  const hourlyNeeded25 = clampMoney(weeklyNeed / 25);
  const hourlyNeeded10 = clampMoney(weeklyNeed / 10);

  const simProjected = clampMoney(simRate) * clampMoney(simQty);
  const simRemaining = Math.max(0, remainingGap - simProjected);

  const sortedOpportunities = useMemo(() => {
    return [...sideHustles]
      .map((row) => ({
        ...row,
        projected: clampMoney(row.rate) * clampMoney(row.planned_quantity),
        rateValue: clampMoney(row.rate),
      }))
      .sort((a, b) => b.rateValue - a.rateValue);
  }, [sideHustles]);

  const recommendedPath = useMemo(() => {
    let need = gapThisWeek;
    const picks: { name: string; projected: number }[] = [];

    for (const row of sortedOpportunities) {
      if (need <= 0) break;
      if (row.projected <= 0) continue;
      picks.push({ name: row.name, projected: row.projected });
      need -= row.projected;
    }

    return { picks, remaining: Math.max(0, need) };
  }, [gapThisWeek, sortedOpportunities]);

  const vsLastMonth =
    lastMonthTotal > 0
      ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
      : null;

  const troubleDetected =
    emergencyMode ||
    remainingGap > 0 ||
    gapThisWeek > 0 ||
    (lastMonthTotal > 0 && thisMonthTotal < lastMonthTotal * 0.65);

  useEffect(() => {
    if (!loading && troubleDetected) {
      const t = setTimeout(() => setShowPlan(true), 700);
      return () => clearTimeout(t);
    }
  }, [loading, troubleDetected]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income Room",
    totalNeeded: gapThisWeek,
    incomeSoFar: plannedIncome,
    incomeGap: remainingGap,
    dailyIncomeNeeded: Math.ceil(remainingGap / 7),
  });

  if (loading) {
    return (
      <main className="min-h-screen bg-black flex items-center justify-center">
        <p className="font-cinzel text-[#c9a84c]">Opening Franklin&apos;s Bank…</p>
      </main>
    );
  }

  return (
    <main
      className="min-h-screen bg-black text-[#f5e6c8]"
      style={{ fontFamily: "EB Garamond, serif" }}
    >
      <section className="relative mx-auto max-w-5xl">
        <img src={INCOME_BG} alt="Income Ledger" className="block h-auto w-full" />

        <a
          href="/world"
          className="absolute left-4 top-4 rounded-full px-4 py-2 text-sm"
          style={{
            background: "rgba(0,0,0,.68)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          ← Back to Town
        </a>

        <div className="absolute inset-x-0 top-4 text-center px-20 pointer-events-none">
          <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-[#c9a84c]">
            Franklin&apos;s Bank
          </p>
          <h1 className="font-cinzel text-3xl sm:text-5xl font-black text-[#f5e6c8] drop-shadow">
            Income Ledger
          </h1>
        </div>
      </section>

      <section className="relative z-10 mx-auto max-w-5xl px-4 pb-28 -mt-3 sm:-mt-10">
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{
            background: "linear-gradient(180deg, rgba(8,5,3,.92), rgba(0,0,0,.98))",
            border: "1px solid rgba(201,168,76,.35)",
            boxShadow: "0 -30px 80px rgba(0,0,0,.85)",
          }}
        >
          {message && (
            <div
              className="mb-4 rounded-xl px-4 py-3 text-center text-sm"
              style={{
                background: "rgba(201,168,76,.12)",
                border: "1px solid rgba(201,168,76,.3)",
                color: "#c9a84c",
              }}
            >
              {message}
            </div>
          )}

          {troubleDetected && (
            <button
              onClick={() => setShowPlan(true)}
              className="mb-4 w-full rounded-2xl px-4 py-3 text-left"
              style={{
                background: "rgba(248,113,113,.14)",
                border: "1px solid rgba(248,113,113,.45)",
                color: "#fee2e2",
              }}
            >
              🚨 Ben detects pressure in the treasury. Tap to open the Income Rescue Plan.
            </button>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <MiniMetric icon="🪙" label="This Month" value={money(thisMonthTotal)} good />
            <MiniMetric icon="⏱️" label="Avg Hourly" value={avgHourly > 0 ? money(avgHourly) : "—"} />
            <MiniMetric icon="📅" label="Weekly Need" value={money(weeklyNeed)} />
            <MiniMetric
              icon="🔥"
              label="Weekly Gap"
              value={money(gapThisWeek)}
              danger={gapThisWeek > 0}
              good={gapThisWeek <= 0}
            />
          </div>

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <button
              onClick={() => setShowAddIncome((v) => !v)}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ background: "#166534", border: "1px solid #4ade80" }}
            >
              + Record Income
            </button>

            <button
              onClick={() => setShowPlan((v) => !v)}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(201,168,76,.45)" }}
            >
              📜 Income Plan
            </button>

            <button
              onClick={() => {
                setEmergencyMode(true);
                setShowPlan(true);
              }}
              className="rounded-xl py-4 font-cinzel text-lg"
              style={{ border: "1px solid rgba(248,113,113,.45)", color: "#fecaca" }}
            >
              🚨 Need Money Fast
            </button>
          </div>

          {showAddIncome && (
            <RoomCard className="mt-4">
              <h2 className="font-cinzel text-center text-lg font-bold text-[#c9a84c]">
                Record Income
              </h2>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <label>
                  <GoldLabel>Amount</GoldLabel>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                    placeholder="0.00"
                  />
                </label>

                <label>
                  <GoldLabel>Paid By / Source</GoldLabel>
                  <input
                    value={source}
                    onChange={(e) => setSource(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                    placeholder="DoorDash, employer, client..."
                  />
                </label>

                <label>
                  <GoldLabel>Category</GoldLabel>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.icon} {c.label}
                      </option>
                    ))}
                  </select>
                </label>

                <label>
                  <GoldLabel>Hours Worked</GoldLabel>
                  <input
                    type="number"
                    inputMode="decimal"
                    value={hoursWorked}
                    onChange={(e) => setHoursWorked(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                    placeholder="Optional"
                  />
                </label>

                <label>
                  <GoldLabel>Date</GoldLabel>
                  <input
                    type="date"
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
                    className="w-full rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                  />
                </label>

                <button
                  onClick={handleAddIncome}
                  disabled={saving}
                  className="rounded-xl py-3 font-bold"
                  style={{ background: "#166534", border: "1px solid #4ade80" }}
                >
                  {saving ? "Recording…" : "Save Income"}
                </button>
              </div>
            </RoomCard>
          )}

          <RoomCard className="mt-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="font-cinzel text-lg font-bold text-[#c9a84c]">
                  Income This Month
                </h3>
                <p className="text-4xl font-black text-[#f5e6c8]">{money(thisMonthTotal)}</p>
                {vsLastMonth !== null && (
                  <p
                    className="text-sm font-bold"
                    style={{ color: vsLastMonth >= 0 ? "#4ade80" : "#f87171" }}
                  >
                    {vsLastMonth >= 0 ? "+" : ""}
                    {vsLastMonth}% vs last month
                  </p>
                )}

                <div className="mt-4 h-44">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={chartData} margin={{ top: 0, right: 0, left: -20, bottom: 0 }}>
                      <XAxis dataKey="month" tick={{ fill: "#d6c09a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: "#d6c09a", fontSize: 10 }} axisLine={false} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          background: "#130c06",
                          border: "1px solid #6b4423",
                          borderRadius: 8,
                          color: "#e8d5b7",
                        }}
                        formatter={(v: number) => [money(v), "Income"]}
                      />
                      <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                        {chartData.map((entry, i) => (
                          <Cell key={i} fill={entry.current ? "#c9a84c" : "#4a5568"} />
                        ))}
                      </Bar>
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <MiniMetric icon="🏦" label="All Time" value={money(allTimeTotal)} />
                <MiniMetric icon="📈" label="Average Month" value={money(avgMonthly)} />
                <MiniMetric icon="👥" label="Sources" value={String(sourcesCount)} />
                <MiniMetric icon="🏆" label="Best Month" value={money(highestMonth.total)} />
              </div>
            </div>
          </RoomCard>

          {showPlan && (
            <RoomCard className="mt-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#c9a84c]">
                    Ben&apos;s Income Rescue Plan
                  </p>
                  <h2 className="font-cinzel text-2xl font-black text-[#f5e6c8]">
                    What thou needest to earn
                  </h2>
                </div>
                <button onClick={() => setShowPlan(false)} className="rounded-full px-3 py-1 border border-[#c9a84c]/40">
                  ✕
                </button>
              </div>

              <p className="mt-3 rounded-xl bg-black/50 p-3 text-[#e8d5b7]">
                Ben says: {benInsight.text}
              </p>

              <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-3">
                <MiniMetric icon="📆" label="Monthly Need" value={money(monthlyNeed)} />
                <MiniMetric icon="🗓️" label="Weekly Need" value={money(weeklyNeed)} />
                <MiniMetric icon="☀️" label="Daily Need" value={money(dailyNeed)} />
                <MiniMetric icon="⚠️" label="Remaining Gap" value={money(remainingGap)} danger={remainingGap > 0} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3">
                <MiniMetric icon="40h" label="Needed/hr" value={money(hourlyNeeded40)} />
                <MiniMetric icon="25h" label="Needed/hr" value={money(hourlyNeeded25)} />
                <MiniMetric icon="10h" label="Needed/hr" value={money(hourlyNeeded10)} />
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {templates.map((template) => (
                  <button
                    key={template.name}
                    onClick={() => applyTemplate(template)}
                    className="rounded-xl p-3 text-left"
                    style={{
                      background: "rgba(245,230,200,.08)",
                      border: "1px solid rgba(201,168,76,.25)",
                    }}
                  >
                    <p className="font-bold text-[#f5e6c8]">{template.name}</p>
                    <p className="text-sm text-[#c9a84c]">
                      {money(template.rate)} × {template.planned_quantity} ={" "}
                      {money(template.rate * template.planned_quantity)}
                    </p>
                    <p className="text-xs text-[#9a7d5a]">{template.note}</p>
                  </button>
                ))}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Income option name"
                  className="rounded-lg px-3 py-2 text-black"
                  style={{ background: "#f5e6c8" }}
                />

                <select
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value as IncomeType)}
                  className="rounded-lg px-3 py-2 text-black"
                  style={{ background: "#f5e6c8" }}
                >
                  <option value="hourly">Hourly</option>
                  <option value="item">Per item</option>
                  <option value="project">Per project</option>
                  <option value="fixed">Fixed amount</option>
                </select>

                <input
                  value={rate}
                  onChange={(e) => setRate(e.target.value)}
                  placeholder="Rate"
                  inputMode="decimal"
                  className="rounded-lg px-3 py-2 text-black"
                  style={{ background: "#f5e6c8" }}
                />

                <input
                  value={plannedQuantity}
                  onChange={(e) => setPlannedQuantity(e.target.value)}
                  placeholder="Hours / items / projects"
                  inputMode="decimal"
                  className="rounded-lg px-3 py-2 text-black"
                  style={{ background: "#f5e6c8" }}
                />

                <input
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Note"
                  className="rounded-lg px-3 py-2 text-black sm:col-span-2"
                  style={{ background: "#f5e6c8" }}
                />

                <button
                  onClick={handleAddSideHustle}
                  disabled={saving || !userId}
                  className="rounded-xl py-3 font-bold sm:col-span-2"
                  style={{ background: "#166534", border: "1px solid #4ade80" }}
                >
                  Save Income Option
                </button>
              </div>

              <div className="mt-4 rounded-xl border border-[#c9a84c]/30 p-3">
                <p className="font-cinzel text-sm text-[#c9a84c]">What-if Simulator</p>
                <div className="mt-2 grid grid-cols-2 gap-3">
                  <input
                    value={simRate}
                    onChange={(e) => setSimRate(e.target.value)}
                    placeholder="Rate"
                    className="rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                  />
                  <input
                    value={simQty}
                    onChange={(e) => setSimQty(e.target.value)}
                    placeholder="Quantity"
                    className="rounded-lg px-3 py-2 text-black"
                    style={{ background: "#f5e6c8" }}
                  />
                </div>
                <p className="mt-3 text-[#d6c09a]">
                  Projected: <b className="text-[#4ade80]">{money(simProjected)}</b> ·
                  Remaining after this:{" "}
                  <b className={simRemaining > 0 ? "text-red-300" : "text-green-300"}>
                    {money(simRemaining)}
                  </b>
                </p>
              </div>

              <div className="mt-4 space-y-2">
                {sortedOpportunities.length === 0 ? (
                  <p className="text-center text-[#9a7d5a]">No income options saved yet.</p>
                ) : (
                  sortedOpportunities.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between gap-3 rounded-xl p-3"
                      style={{
                        background: "rgba(0,0,0,.45)",
                        border: "1px solid rgba(201,168,76,.22)",
                      }}
                    >
                      <div>
                        <p className="font-bold text-[#f5e6c8]">{row.name}</p>
                        <p className="text-xs text-[#9a7d5a]">
                          {money(row.rate)} × {safeNum(row.planned_quantity)} · {row.income_type}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="font-bold text-[#4ade80]">{money(row.projected)}</p>
                        <button
                          onClick={() => void handleDeleteSideHustle(row.id)}
                          className="text-xs text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {recommendedPath.picks.length > 0 && (
                <div className="mt-4 rounded-xl bg-emerald-950/40 p-4 border border-emerald-500/30">
                  <p className="font-cinzel text-[#4ade80]">Fastest Path</p>
                  <p className="mt-1 text-sm text-[#d1fae5]">
                    {recommendedPath.remaining <= 0
                      ? "Treasury secured. This plan covers the gap."
                      : `${money(recommendedPath.remaining)} still uncovered.`}
                  </p>
                </div>
              )}
            </RoomCard>
          )}

          <RoomCard className="mt-4">
            <h3 className="font-cinzel text-lg font-bold text-[#c9a84c]">Recent Income</h3>
            <div className="mt-3 space-y-2">
              {entries.slice(0, 6).length === 0 ? (
                <p className="text-center text-[#9a7d5a]">No income entries yet.</p>
              ) : (
                entries.slice(0, 6).map((e) => {
                  const cat = getCategoryInfo(e.category);
                  return (
                    <div key={e.id} className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xl">{cat.icon}</span>
                        <div>
                          <p className="font-bold text-[#f5e6c8]">
                            {e.source || cat.label}
                          </p>
                          <p className="text-xs text-[#9a7d5a]">{entryDateStr(e)}</p>
                        </div>
                      </div>
                      <p className="font-bold text-[#c9a84c]">{money(e.amount)}</p>
                    </div>
                  );
                })
              )}
            </div>
          </RoomCard>

          <p className="mt-5 text-center italic text-[#c9a84c]">
            “Diligence is the mother of good luck.” — Benjamin Franklin
          </p>
        </div>
      </section>
    </main>
  );
}
