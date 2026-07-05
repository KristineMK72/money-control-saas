"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

const CATEGORIES = [
  { value: "employment", label: "Employment", icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services", label: "Services", icon: "📋" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "gifts", label: "Gifts", icon: "🎁" },
  { value: "other", label: "Other", icon: "💰" },
];

const templates = [
  {
    name: "DoorDash",
    income_type: "hourly" as const,
    rate: 20,
    planned_quantity: 5,
    note: "Quick cash shift",
  },
  {
    name: "Beauty Service",
    income_type: "project" as const,
    rate: 75,
    planned_quantity: 1,
    note: "Service appointment",
  },
  {
    name: "Hair Color",
    income_type: "project" as const,
    rate: 120,
    planned_quantity: 1,
    note: "High-value service",
  },
  {
    name: "Haircut",
    income_type: "project" as const,
    rate: 40,
    planned_quantity: 1,
    note: "Quick service",
  },
  {
    name: "Marketplace Sale",
    income_type: "item" as const,
    rate: 25,
    planned_quantity: 3,
    note: "Sell unused items",
  },
  {
    name: "Overtime Shift",
    income_type: "hourly" as const,
    rate: 22,
    planned_quantity: 4,
    note: "Extra hours",
  },
  {
    name: "Freelance Project",
    income_type: "project" as const,
    rate: 150,
    planned_quantity: 1,
    note: "One project",
  },
];

function safeNum(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function entryDateStr(entry: IncomeEntry) {
  return (entry.date_iso || entry.received_on || entry.created_at || "").slice(
    0,
    10
  );
}

function monthPrefix(dateText: string) {
  return dateText.slice(0, 7);
}

function getCategoryInfo(category?: string | null) {
  return (
    CATEGORIES.find((item) => item.value === (category || "").toLowerCase()) ??
    {
      label: "Income",
      icon: "💰",
    }
  );
}

function startOfToday() {
  const date = new Date();
  date.setHours(0, 0, 0, 0);
  return date;
}

function endOfWindow(daysFromNow: number) {
  const date = startOfToday();
  date.setDate(date.getDate() + daysFromNow);
  date.setHours(23, 59, 59, 999);
  return date;
}

function parseDateSafe(dateISO?: string | null) {
  if (!dateISO) return null;
  const date = new Date(`${dateISO}T12:00:00`);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getNextDueDateFromDay(dueDay?: number | null) {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const today = startOfToday();

  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const thisMonthDue = new Date(
    year,
    month,
    Math.min(dueDay, lastDayThisMonth),
    12
  );

  if (thisMonthDue >= today) {
    return thisMonthDue.toISOString().slice(0, 10);
  }

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const lastDayNextMonth = new Date(
    nextMonthYear,
    nextMonth + 1,
    0
  ).getDate();

  return new Date(
    nextMonthYear,
    nextMonth,
    Math.min(dueDay, lastDayNextMonth),
    12
  )
    .toISOString()
    .slice(0, 10);
}

function effectiveBillDueDate(bill: BillRow) {
  if (bill.due_date) return bill.due_date;
  if (bill.is_monthly && bill.due_day) {
    return getNextDueDateFromDay(bill.due_day);
  }
  return null;
}

function effectiveDebtDueDate(debt: DebtRow) {
  if (debt.due_date) return debt.due_date;
  if (debt.is_monthly && debt.due_day) {
    return getNextDueDateFromDay(debt.due_day);
  }
  return null;
}

function getWeeklyGapFromView(weeklySql: BenWeeklyRow | null) {
  if (!weeklySql) return 0;

  const row = weeklySql as Record<string, unknown>;

  return Math.max(
    0,
    safeNum(
      row.gap_week ??
        row.week_gap ??
        row.income_gap ??
        row.gap ??
        row.total_gap ??
        0
    )
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
    <section className={`room-card ${className}`}>
      {children}
    </section>
  );
}

function GoldLabel({ children }: { children: React.ReactNode }) {
  return <label className="gold-label">{children}</label>;
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
    <div className="mini-metric">
      <div className="mini-icon">{icon}</div>
      <p className="mini-label">{label}</p>
      <p className={danger ? "mini-value danger" : good ? "mini-value good" : "mini-value"}>
        {value}
      </p>
    </div>
  );
}

function DrawerButton({
  children,
  active,
  danger,
  onClick,
}: {
  children: React.ReactNode;
  active?: boolean;
  danger?: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        "drawer-button",
        active ? "active" : "",
        danger ? "danger" : "",
      ].join(" ")}
    >
      {children}
    </button>
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
  const [drawer, setDrawer] = useState<"record" | "scan" | "plan" | null>(
    "record"
  );
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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);

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
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),

      supabase
        .from("spend_entries")
        .select("id, amount, date_iso")
        .eq("user_id", user.id),

      supabase
        .from("payments")
        .select("id, amount, date_iso")
        .eq("user_id", user.id),

      supabase
        .from("bills")
        .select("id, target, due_date, is_monthly, monthly_target, due_day")
        .eq("user_id", user.id),

      supabase
        .from("debts")
        .select(
          "id, min_payment, due_date, is_monthly, due_day, monthly_min_payment"
        )
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
    setWeeklySql(
      !weeklyRes.error && weeklyRes.data ? (weeklyRes.data as BenWeeklyRow) : null
    );

    setLoading(false);
  }

  async function handleScanIncome() {
    if (!imageFile) {
      setMessage("Choose a screenshot, deposit, or income proof first.");
      return;
    }

    setScanning(true);
    setMessage("Ben is reading the income proof…");

    try {
      const { text } = await ocrImageFile(imageFile);
      const first = parseTransactionsScreenshot(text)[0];

      if (!first) {
        setMessage("No clear income found. Fill it in manually.");
        setScanning(false);
        return;
      }

      setSource(first.merchant || "");

      if (first.amount) {
        setAmount(String(first.amount));
      }

      if (first.dateText && /^\d{4}-\d{2}-\d{2}$/.test(first.dateText)) {
        setDate(first.dateText);
      }

      setDrawer("record");
      setMessage("Scanner filled what it could. Review before saving.");
    } catch {
      setMessage("Scanner had trouble with that proof. Manual entry still works.");
    }

    setScanning(false);
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
    setImageFile(null);
    setDrawer(null);
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
    setDrawer("plan");
    setMessage(`${template.name} loaded. Adjust it or save it.`);
  }
    const thisMonthStr = monthPrefix(currentMonthStartISO());

  const lastMonthStr = useMemo(() => {
    const [year, month] = thisMonthStr.split("-").map(Number);
    const lastMonth = month === 1 ? 12 : month - 1;
    const lastYear = month === 1 ? year - 1 : year;
    return `${lastYear}-${String(lastMonth).padStart(2, "0")}`;
  }, [thisMonthStr]);

  const thisMonthTotal = useMemo(
    () =>
      addMoney(
        entries
          .filter((entry) => monthPrefix(entryDateStr(entry)) === thisMonthStr)
          .map((entry) => entry.amount)
      ),
    [entries, thisMonthStr]
  );

  const lastMonthTotal = useMemo(
    () =>
      addMoney(
        entries
          .filter((entry) => monthPrefix(entryDateStr(entry)) === lastMonthStr)
          .map((entry) => entry.amount)
      ),
    [entries, lastMonthStr]
  );

  const allTimeTotal = useMemo(
    () => addMoney(entries.map((entry) => entry.amount)),
    [entries]
  );

  const avgMonthly = useMemo(() => {
    if (!entries.length) return 0;
    const months = new Set(entries.map((entry) => monthPrefix(entryDateStr(entry))));
    return clampMoney(allTimeTotal / Math.max(months.size, 1));
  }, [entries, allTimeTotal]);

  const avgHourly = useMemo(() => {
    const hourlyEntries = entries
      .map((entry) => ({
        amount: clampMoney(entry.amount),
        hours: clampMoney(entry.hours_worked),
      }))
      .filter((entry) => entry.amount > 0 && entry.hours > 0);

    const totalAmount = addMoney(hourlyEntries.map((entry) => entry.amount));
    const totalHours = addMoney(hourlyEntries.map((entry) => entry.hours));

    return totalHours > 0 ? clampMoney(totalAmount / totalHours) : 0;
  }, [entries]);

  const highestMonth = useMemo(() => {
    const byMonth = new Map<string, { total: number; label: string }>();

    entries.forEach((entry) => {
      const key = monthPrefix(entryDateStr(entry));
      const [year, month] = key.split("-").map(Number);
      const label = new Date(year, month - 1, 1).toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
      });

      const current = byMonth.get(key) || { total: 0, label };
      byMonth.set(key, {
        total: addMoney([current.total, entry.amount]),
        label,
      });
    });

    let best = { total: 0, label: "—" };

    byMonth.forEach((value) => {
      if (value.total > best.total) best = value;
    });

    return best;
  }, [entries]);

  const sourcesCount = useMemo(
    () => new Set(entries.map((entry) => entry.source || entry.category || "other")).size,
    [entries]
  );

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const [year, month] = thisMonthStr.split("-").map(Number);
      const rawMonth = month - (5 - index);
      const adjustedMonth = ((rawMonth - 1 + 12) % 12) + 1;
      const adjustedYear = year + Math.floor((rawMonth - 1) / 12);
      const key = `${adjustedYear}-${String(adjustedMonth).padStart(2, "0")}`;

      return {
        month: new Date(adjustedYear, adjustedMonth - 1, 1).toLocaleDateString(
          "en-US",
          { month: "short" }
        ),
        total: addMoney(
          entries
            .filter((entry) => monthPrefix(entryDateStr(entry)) === key)
            .map((entry) => entry.amount)
        ),
        current: index === 5,
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
        sideHustles.map(
          (row) => clampMoney(row.rate) * clampMoney(row.planned_quantity)
        )
      ),
    [sideHustles]
  );

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);
  const monthlyNeed = useMemo(() => {
    const monthlyBills = addMoney(
      bills.map((bill) => clampMoney(bill.monthly_target || bill.target))
    );

    const monthlyDebt = addMoney(
      debts.map((debt) =>
        clampMoney(debt.monthly_min_payment || debt.min_payment)
      )
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
      const timer = setTimeout(() => setDrawer("plan"), 700);
      return () => clearTimeout(timer);
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
      <main className="bank-page loading-room">
        <p>Opening Franklin&apos;s Bank…</p>
      </main>
    );
  }
    return (
    <main className="bank-page">
      <section className="bank-hero">
        <div className="hero-frame">
          <img src={INCOME_BG} alt="Franklin's Bank" className="hero-img" />
          <div className="hero-shade" />

          <Link href="/world" className="back-btn">
            ← Back to Town
          </Link>

          <div className="hero-title">
            <p className="eyebrow">Franklin&apos;s Bank</p>
            <h1>Income Ledger</h1>
            <p>
              Record earnings, scan proof, and let Ben turn every dollar into
              progress for the treasury.
            </p>
          </div>
        </div>
      </section>

      <section className="desk-wrap">
        {message && <div className="notice">{message}</div>}

        {troubleDetected && (
          <button
            onClick={() => setDrawer("plan")}
            className="pressure-alert"
          >
            🚨 Ben detects pressure in the treasury. Tap to open the Income
            Rescue Plan.
          </button>
        )}

        <div className="stats-grid">
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

        <RoomCard>
          <h2>Ben&apos;s Bank Briefing</h2>
          <p className="card-sub">A word from the desk before the ledger opens.</p>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </RoomCard>

        <div className="drawer-buttons">
          <DrawerButton
            active={drawer === "record"}
            onClick={() => setDrawer(drawer === "record" ? null : "record")}
          >
            + Record Income
          </DrawerButton>

          <DrawerButton
            active={drawer === "scan"}
            onClick={() => setDrawer(drawer === "scan" ? null : "scan")}
          >
            📸 Scan Deposit
          </DrawerButton>

          <DrawerButton
            active={drawer === "plan"}
            onClick={() => setDrawer(drawer === "plan" ? null : "plan")}
          >
            📜 Income Plan
          </DrawerButton>

          <DrawerButton
            danger
            active={emergencyMode}
            onClick={() => {
              setEmergencyMode(true);
              setDrawer("plan");
            }}
          >
            🚨 Need Money Fast
          </DrawerButton>
        </div>

        {drawer === "record" && (
          <RoomCard className="drawer-panel">
            <h2>Record Income</h2>
            <p className="card-sub">
              Earn it, name it, and put it in Franklin&apos;s ledger.
            </p>

            <div className="form-grid">
              <label>
                <GoldLabel>Amount</GoldLabel>
                <input
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(event) => setAmount(event.target.value)}
                  placeholder="0.00"
                />
              </label>

              <label>
                <GoldLabel>Paid By / Source</GoldLabel>
                <input
                  value={source}
                  onChange={(event) => setSource(event.target.value)}
                  placeholder="DoorDash, employer, client..."
                />
              </label>

              <label>
                <GoldLabel>Category</GoldLabel>
                <select
                  value={category}
                  onChange={(event) => setCategory(event.target.value)}
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>
                      {cat.icon} {cat.label}
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
                  onChange={(event) => setHoursWorked(event.target.value)}
                  placeholder="Optional"
                />
              </label>

              <label>
                <GoldLabel>Date</GoldLabel>
                <input
                  type="date"
                  value={date}
                  onChange={(event) => setDate(event.target.value)}
                />
              </label>

              <button
                onClick={handleAddIncome}
                disabled={saving}
                className="save-btn"
              >
                {saving ? "Recording…" : "💰 Save Income"}
              </button>
            </div>
          </RoomCard>
        )}

        {drawer === "scan" && (
          <RoomCard className="drawer-panel">
            <h2>Scan Income Proof</h2>
            <p className="card-sub">
              Upload a DoorDash screenshot, paycheck, deposit, or income proof.
            </p>

            <PaperScrollScanner
              title="Scan Income Proof"
              description="Ben will fill what he can. Review it before saving."
              file={imageFile}
              busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanIncome()}
            />
          </RoomCard>
        )}

        <RoomCard>
          <div className="chart-grid">
            <div>
              <h2>Income This Month</h2>
              <p className="big-money">{money(thisMonthTotal)}</p>

              {vsLastMonth !== null && (
                <p className={vsLastMonth >= 0 ? "trend good" : "trend danger"}>
                  {vsLastMonth >= 0 ? "+" : ""}
                  {vsLastMonth}% vs last month
                </p>
              )}

              <div className="chart-box">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={chartData}
                    margin={{ top: 0, right: 0, left: -20, bottom: 0 }}
                  >
                    <XAxis
                      dataKey="month"
                      tick={{ fill: "#d6c09a", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis
                      tick={{ fill: "#d6c09a", fontSize: 10 }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "#130c06",
                        border: "1px solid #6b4423",
                        borderRadius: 8,
                        color: "#e8d5b7",
                      }}
                      formatter={(value: number) => [money(value), "Income"]}
                    />
                    <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                      {chartData.map((entry, index) => (
                        <Cell
                          key={index}
                          fill={entry.current ? "#c9a84c" : "#4a5568"}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            <div className="mini-grid">
              <MiniMetric icon="🏦" label="All Time" value={money(allTimeTotal)} />
              <MiniMetric icon="📈" label="Average Month" value={money(avgMonthly)} />
              <MiniMetric icon="👥" label="Sources" value={String(sourcesCount)} />
              <MiniMetric icon="🏆" label="Best Month" value={money(highestMonth.total)} />
            </div>
          </div>
        </RoomCard>

        {drawer === "plan" && (
          <RoomCard className="drawer-panel">
            <div className="plan-head">
              <div>
                <p className="eyebrow small">Ben&apos;s Income Rescue Plan</p>
                <h2>What thou needest to earn</h2>
              </div>

              <button onClick={() => setDrawer(null)} className="close-btn">
                ✕
              </button>
            </div>

            <p className="ben-plan">Ben says: {benInsight.text}</p>

            <div className="mini-grid four">
              <MiniMetric icon="📆" label="Monthly Need" value={money(monthlyNeed)} />
              <MiniMetric icon="🗓️" label="Weekly Need" value={money(weeklyNeed)} />
              <MiniMetric icon="☀️" label="Daily Need" value={money(dailyNeed)} />
              <MiniMetric
                icon="⚠️"
                label="Remaining Gap"
                value={money(remainingGap)}
                danger={remainingGap > 0}
              />
            </div>

            <div className="mini-grid three">
              <MiniMetric icon="40h" label="Needed/hr" value={money(hourlyNeeded40)} />
              <MiniMetric icon="25h" label="Needed/hr" value={money(hourlyNeeded25)} />
              <MiniMetric icon="10h" label="Needed/hr" value={money(hourlyNeeded10)} />
            </div>

            <div className="template-grid">
              {templates.map((template) => (
                <button
                  key={template.name}
                  onClick={() => applyTemplate(template)}
                  className="template-btn"
                >
                  <strong>{template.name}</strong>
                  <span>
                    {money(template.rate)} × {template.planned_quantity} ={" "}
                    {money(template.rate * template.planned_quantity)}
                  </span>
                  <small>{template.note}</small>
                </button>
              ))}
            </div>

            <div className="plan-form">
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                placeholder="Income option name"
              />

              <select
                value={incomeType}
                onChange={(event) =>
                  setIncomeType(event.target.value as IncomeType)
                }
              >
                <option value="hourly">Hourly</option>
                <option value="item">Per item</option>
                <option value="project">Per project</option>
                <option value="fixed">Fixed amount</option>
              </select>

              <input
                value={rate}
                onChange={(event) => setRate(event.target.value)}
                placeholder="Rate"
                inputMode="decimal"
              />

              <input
                value={plannedQuantity}
                onChange={(event) => setPlannedQuantity(event.target.value)}
                placeholder="Hours / items / projects"
                inputMode="decimal"
              />

              <input
                value={note}
                onChange={(event) => setNote(event.target.value)}
                placeholder="Note"
                className="wide"
              />

              <button
                onClick={handleAddSideHustle}
                disabled={saving || !userId}
                className="save-btn wide"
              >
                Save Income Option
              </button>
            </div>

            <div className="sim-box">
              <p className="eyebrow small">What-if Simulator</p>

              <div className="sim-grid">
                <input
                  value={simRate}
                  onChange={(event) => setSimRate(event.target.value)}
                  placeholder="Rate"
                />
                <input
                  value={simQty}
                  onChange={(event) => setSimQty(event.target.value)}
                  placeholder="Quantity"
                />
              </div>

              <p>
                Projected: <b>{money(simProjected)}</b> · Remaining after this:{" "}
                <b className={simRemaining > 0 ? "danger-text" : "good-text"}>
                  {money(simRemaining)}
                </b>
              </p>
            </div>

            <div className="opportunity-list">
              {sortedOpportunities.length === 0 ? (
                <p className="empty">No income options saved yet.</p>
              ) : (
                sortedOpportunities.map((row) => (
                  <div key={row.id} className="opportunity-row">
                    <div>
                      <strong>{row.name}</strong>
                      <p>
                        {money(row.rate)} × {safeNum(row.planned_quantity)} ·{" "}
                        {row.income_type}
                      </p>
                    </div>

                    <div className="right">
                      <strong>{money(row.projected)}</strong>
                      <button onClick={() => void handleDeleteSideHustle(row.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

            {recommendedPath.picks.length > 0 && (
              <div className="fast-path">
                <p className="eyebrow small">Fastest Path</p>
                <p>
                  {recommendedPath.remaining <= 0
                    ? "Treasury secured. This plan covers the gap."
                    : `${money(recommendedPath.remaining)} still uncovered.`}
                </p>
              </div>
            )}
          </RoomCard>
        )}

        <RoomCard>
          <h2>Recent Income</h2>

          <div className="recent-list">
            {entries.slice(0, 6).length === 0 ? (
              <p className="empty">No income entries yet.</p>
            ) : (
              entries.slice(0, 6).map((entry) => {
                const cat = getCategoryInfo(entry.category);

                return (
                  <div key={entry.id} className="recent-row">
                    <div className="recent-left">
                      <span>{cat.icon}</span>
                      <div>
                        <strong>{entry.source || cat.label}</strong>
                        <p>{entryDateStr(entry)}</p>
                      </div>
                    </div>

                    <strong className="amount">{money(entry.amount)}</strong>
                  </div>
                );
              })
            )}
          </div>
        </RoomCard>

        <p className="quote">
          “Diligence is the mother of good luck.” — Benjamin Franklin
        </p>
      </section>
            <style jsx>{`
        .bank-page {
          min-height: 100vh;
          padding-top: 250px;
          padding-bottom: 100px;
          background:
            radial-gradient(circle at top, rgba(245, 196, 88, 0.12), transparent 32rem),
            linear-gradient(180deg, #050302, #140a04 45%, #050302);
          color: #fff7ed;
          font-family: var(--font-inter), system-ui, sans-serif;
        }

        .loading-room {
          display: grid;
          place-items: center;
          color: #c9a84c;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 22px;
        }

        .bank-hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 18px;
        }

        .hero-frame {
          position: relative;
          width: 100%;
          border-radius: 32px;
          overflow: hidden;
          background: #050302;
          border: 1px solid rgba(201, 168, 76, 0.35);
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.65);
        }

        .hero-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 620px;
          object-fit: contain;
          object-position: center;
        }

        .hero-shade {
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(180deg, rgba(5, 3, 2, 0.04), rgba(5, 3, 2, 0.14) 48%, rgba(5, 3, 2, 0.84)),
            linear-gradient(90deg, rgba(5, 3, 2, 0.58), transparent 48%, rgba(5, 3, 2, 0.38));
        }

        .back-btn {
          position: absolute;
          top: 18px;
          left: 18px;
          z-index: 3;
          color: #f5e6c8;
          text-decoration: none;
          border: 1px solid rgba(201, 168, 76, 0.42);
          background: rgba(0, 0, 0, 0.64);
          border-radius: 999px;
          padding: 10px 16px;
          font-size: 14px;
        }

        .hero-title {
          position: absolute;
          left: 24px;
          right: 24px;
          bottom: 22px;
          z-index: 3;
          max-width: 680px;
        }

        .eyebrow {
          margin: 0 0 8px;
          color: #facc15;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 900;
          font-size: 13px;
        }

        .eyebrow.small {
          font-size: 11px;
          letter-spacing: 0.22em;
        }

        h1 {
          margin: 0;
          color: #fff7ed;
          font-size: clamp(48px, 8vw, 88px);
          line-height: 0.88;
          font-family: var(--font-cormorant), Georgia, serif;
          text-shadow: 0 8px 28px rgba(0, 0, 0, 0.9);
        }

        .hero-title p:not(.eyebrow) {
          max-width: 620px;
          margin: 12px 0 0;
          color: #ead9bd;
          font-size: 19px;
          line-height: 1.35;
        }

        .desk-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 18px 18px;
          display: grid;
          gap: 18px;
        }

        .notice {
          border-radius: 20px;
          padding: 14px 16px;
          color: #facc15;
          background: rgba(15, 8, 4, 0.92);
          border: 1px solid rgba(201, 168, 76, 0.35);
          text-align: center;
        }

        .pressure-alert {
          width: 100%;
          border-radius: 22px;
          padding: 15px 16px;
          text-align: left;
          color: #fee2e2;
          background: rgba(127, 29, 29, 0.44);
          border: 1px solid rgba(248, 113, 113, 0.45);
          font-weight: 800;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .room-card {
          border-radius: 28px;
          padding: 22px;
          background: linear-gradient(
            180deg,
            rgba(18, 10, 4, 0.94),
            rgba(5, 3, 2, 0.97)
          );
          border: 1px solid rgba(201, 168, 76, 0.34);
          box-shadow:
            0 24px 80px rgba(0, 0, 0, 0.55),
            inset 0 1px 0 rgba(255, 255, 255, 0.08);
          backdrop-filter: blur(16px);
        }

        .room-card h2 {
          margin: 0;
          color: #f5e6c8;
          font-size: 30px;
          line-height: 1;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .card-sub {
          color: #b99b60;
          margin: 8px 0 18px;
        }

        .drawer-buttons {
          display: grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 14px;
        }

        .drawer-button {
          min-height: 76px;
          border-radius: 26px;
          border: 1px solid rgba(201, 168, 76, 0.36);
          background: rgba(0, 0, 0, 0.68);
          color: #f5e6c8;
          font-family: var(--font-cormorant), Georgia, serif;
          font-size: 25px;
          font-weight: 900;
        }

        .drawer-button.active {
          background: rgba(22, 101, 52, 0.95);
          border-color: rgba(74, 222, 128, 0.7);
          color: #f0fdf4;
        }

        .drawer-button.danger {
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.55);
        }

        .drawer-button.danger.active {
          background: rgba(127, 29, 29, 0.82);
        }

        .drawer-panel {
          animation: drawerOpen 0.24s ease-out both;
        }

        @keyframes drawerOpen {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .form-grid,
        .plan-form {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .gold-label {
          display: block;
          color: #d6c09a;
          font-size: 11px;
          letter-spacing: 0.16em;
          text-transform: uppercase;
          font-weight: 900;
          margin-bottom: 7px;
        }

        input,
        select,
        textarea {
          width: 100%;
          border-radius: 16px;
          border: 1px solid rgba(201, 168, 76, 0.45);
          background: rgba(255, 245, 220, 0.95);
          color: #24130a;
          padding: 13px 14px;
          font-size: 16px;
          outline: none;
        }

        .save-btn {
          border: 1px solid rgba(74, 222, 128, 0.65);
          border-radius: 20px;
          padding: 16px 18px;
          background: linear-gradient(180deg, #16a34a, #15803d);
          color: #f0fdf4;
          font-size: 18px;
          font-weight: 900;
        }

        .save-btn:disabled {
          opacity: 0.6;
        }

        .chart-grid {
          display: grid;
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
          gap: 18px;
        }

        .big-money {
          color: #4ade80;
          font-size: 46px;
          font-weight: 900;
          margin: 10px 0 0;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .trend {
          margin: 6px 0 0;
          font-weight: 900;
        }

        .good,
        .good-text {
          color: #4ade80;
        }

        .danger,
        .danger-text {
          color: #f87171;
        }

        .chart-box {
          height: 190px;
          margin-top: 18px;
        }

        .mini-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .mini-grid.three {
          grid-template-columns: repeat(3, minmax(0, 1fr));
          margin-top: 14px;
        }

        .mini-grid.four {
          grid-template-columns: repeat(4, minmax(0, 1fr));
          margin-top: 16px;
        }

        .mini-metric {
          border-radius: 22px;
          padding: 16px;
          text-align: center;
          background: rgba(0, 0, 0, 0.58);
          border: 1px solid rgba(201, 168, 76, 0.25);
        }

        .mini-icon {
          font-size: 27px;
          margin-bottom: 6px;
        }

        .mini-label {
          color: #d6c09a;
          font-size: 10px;
          letter-spacing: 0.14em;
          text-transform: uppercase;
          font-weight: 800;
          margin: 0;
        }

        .mini-value {
          color: #c9a84c;
          font-size: 22px;
          font-weight: 900;
          margin: 6px 0 0;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .mini-value.good {
          color: #4ade80;
        }

        .mini-value.danger {
          color: #f87171;
        }

        .plan-head {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 12px;
        }

        .close-btn {
          border-radius: 999px;
          padding: 8px 12px;
          border: 1px solid rgba(201, 168, 76, 0.4);
          background: rgba(0, 0, 0, 0.45);
          color: #f5e6c8;
        }

        .ben-plan,
        .sim-box,
        .fast-path {
          margin-top: 16px;
          border-radius: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(201, 168, 76, 0.24);
          color: #e8d5b7;
        }

        .template-grid {
          margin-top: 16px;
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
        }

        .template-btn {
          border-radius: 18px;
          padding: 14px;
          text-align: left;
          background: rgba(245, 230, 200, 0.08);
          border: 1px solid rgba(201, 168, 76, 0.25);
          color: #f5e6c8;
        }

        .template-btn span,
        .template-btn small {
          display: block;
          margin-top: 4px;
          color: #c9a84c;
        }

        .template-btn small {
          color: #9a7d5a;
        }

        .plan-form {
          margin-top: 16px;
        }

        .wide {
          grid-column: 1 / -1;
        }

        .sim-grid {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 12px;
          margin-top: 10px;
        }

        .sim-box b {
          color: #4ade80;
        }

        .opportunity-list {
          margin-top: 16px;
          display: grid;
          gap: 10px;
        }

        .opportunity-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          border-radius: 18px;
          padding: 14px;
          background: rgba(0, 0, 0, 0.45);
          border: 1px solid rgba(201, 168, 76, 0.22);
        }

        .opportunity-row strong {
          color: #f5e6c8;
        }

        .opportunity-row p {
          color: #9a7d5a;
          font-size: 13px;
          margin: 4px 0 0;
        }

        .opportunity-row .right {
          text-align: right;
        }

        .opportunity-row .right strong {
          color: #4ade80;
        }

        .opportunity-row button {
          color: #fca5a5;
          background: transparent;
          border: none;
          font-size: 12px;
          margin-top: 4px;
        }

        .fast-path {
          border-color: rgba(74, 222, 128, 0.28);
          background: rgba(6, 78, 59, 0.28);
        }

        .recent-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .recent-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(201, 168, 76, 0.18);
        }

        .recent-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .recent-left span {
          font-size: 24px;
        }

        .recent-left strong {
          color: #f5e6c8;
        }

        .recent-left p {
          margin: 3px 0 0;
          color: #9a7d5a;
          font-size: 13px;
        }

        .recent-row .amount {
          color: #4ade80;
          font-size: 22px;
          font-family: var(--font-cormorant), Georgia, serif;
          white-space: nowrap;
        }

        .empty {
          text-align: center;
          color: #9a7d5a;
        }

        .quote {
          text-align: center;
          color: #c9a84c;
          font-style: italic;
          padding: 18px;
        }

        @media (max-width: 900px) {
          .stats-grid,
          .mini-grid.four {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .drawer-buttons {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }

          .chart-grid {
            grid-template-columns: 1fr;
          }
        }

        @media (max-width: 640px) {
          .bank-page {
            padding-top: 250px;
          }

          .bank-hero {
            padding: 12px;
          }

          .hero-frame {
            border-radius: 24px;
          }

          .hero-img {
            max-height: 420px;
          }

          .back-btn {
            top: 12px;
            left: 12px;
            padding: 8px 13px;
            font-size: 14px;
          }

          .hero-title {
            left: 16px;
            right: 16px;
            bottom: 16px;
          }

          h1 {
            font-size: 46px;
          }

          .hero-title p:not(.eyebrow) {
            font-size: 16px;
          }

          .desk-wrap {
            padding: 0 12px 18px;
          }

          .stats-grid,
          .drawer-buttons,
          .form-grid,
          .plan-form,
          .template-grid,
          .mini-grid,
          .mini-grid.three,
          .mini-grid.four {
            grid-template-columns: 1fr;
          }

          .drawer-button {
            min-height: 68px;
            font-size: 24px;
          }

          .room-card {
            padding: 18px;
          }

          .opportunity-row,
          .recent-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .opportunity-row .right,
          .recent-row .amount {
            align-self: flex-end;
          }
        }
      `}</style>
    </main>
  );
}
