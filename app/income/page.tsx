"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";
import { money, addMoney, clampMoney } from "@/lib/money/math";
import { todayLocalISO, currentMonthStartISO } from "@/lib/money/dates";
import { BenEngine } from "@/lib/ben/engine";
import { playCoins, playError } from "@/lib/sounds";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";

const BANK_BG = "/A6548019-9D0C-4955-B334-4AB5F77E4345.png";

type IncomeEntry = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number | string | null;
  date_iso: string;
  note: string | null;
  created_at: string;
};

type IncomeSource = {
  id: string;
  user_id: string;
  name: string;
  income_type:
    | "hourly"
    | "salary"
    | "weekly"
    | "monthly"
    | "project"
    | "commission"
    | "gig";
  hourly_rate: number | string | null;
  hours_per_week: number | string | null;
  weekly_amount: number | string | null;
  annual_salary: number | string | null;
  monthly_amount: number | string | null;
  active: boolean | null;
  note: string | null;
  created_at: string;
};

type BillRow = {
  id: string;
  target: number | string | null;
  monthly_target: number | string | null;
};

type DebtRow = {
  id: string;
  min_payment: number | string | null;
  monthly_min_payment: number | string | null;
};

type SpendRow = {
  id: string;
  amount: number | string | null;
  date_iso: string | null;
  created_at: string;
};

type Drawer = "record" | "scan" | "sources" | "hourly" | null;

const WEEKS_PER_MONTH = 4.333;
const HOURLY_TARGETS = [40, 30, 20, 10, 5];

const CATEGORIES = [
  { value: "employment", label: "Employment", icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services", label: "Services", icon: "📋" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "gifts", label: "Gifts", icon: "🎁" },
  { value: "other", label: "Other", icon: "💰" },
];

function safeNum(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function entryDate(entry: IncomeEntry) {
  return (entry.date_iso || entry.created_at || "").slice(0, 10);
}

function spendDate(entry: SpendRow) {
  return (entry.date_iso || entry.created_at || "").slice(0, 10);
}

function monthPrefix(date: string) {
  return date.slice(0, 7);
}

function readHoursFromNote(note?: string | null) {
  if (!note) return 0;
  const match = note.match(/Hours:\s*([\d.]+)/i);
  return match ? safeNum(match[1]) : 0;
}

function projectedMonthlyIncome(source: IncomeSource) {
  const hourlyRate = clampMoney(source.hourly_rate);
  const hoursPerWeek = safeNum(source.hours_per_week);
  const weeklyAmount = clampMoney(source.weekly_amount);
  const annualSalary = clampMoney(source.annual_salary);
  const monthlyAmount = clampMoney(source.monthly_amount);

  if (source.income_type === "salary") return annualSalary / 12;
  if (source.income_type === "weekly") return weeklyAmount * WEEKS_PER_MONTH;
  if (source.income_type === "monthly") return monthlyAmount;

  return hourlyRate * hoursPerWeek * WEEKS_PER_MONTH;
}

function projectedWeeklyIncome(source: IncomeSource) {
  return projectedMonthlyIncome(source) / WEEKS_PER_MONTH;
}

function getSourceHourlyRate(source: IncomeSource) {
  const hourlyRate = clampMoney(source.hourly_rate);
  const annualSalary = clampMoney(source.annual_salary);
  const hoursPerWeek = safeNum(source.hours_per_week);

  if (hourlyRate > 0) return hourlyRate;

  if (source.income_type === "salary" && annualSalary > 0 && hoursPerWeek > 0) {
    return annualSalary / 52 / hoursPerWeek;
  }

  return 0;
}

export default function IncomePage() {
  const router = useRouter();
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [message, setMessage] = useState("");
  const [showBenNotice, setShowBenNotice] = useState(false);

  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);

  const [drawer, setDrawer] = useState<Drawer>("record");

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("employment");
  const [hoursWorked, setHoursWorked] = useState("");
  const [date, setDate] = useState(todayLocalISO());

  const [sourceName, setSourceName] = useState("");
  const [sourceType, setSourceType] =
    useState<IncomeSource["income_type"]>("hourly");
  const [sourceHourlyRateInput, setSourceHourlyRateInput] = useState("");
  const [sourceHoursPerWeek, setSourceHoursPerWeek] = useState("");
  const [sourceWeeklyAmount, setSourceWeeklyAmount] = useState("");
  const [sourceAnnualSalary, setSourceAnnualSalary] = useState("");
  const [sourceMonthlyAmount, setSourceMonthlyAmount] = useState("");
  const [sourceNote, setSourceNote] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [scanning, setScanning] = useState(false);
  const [scanRows, setScanRows] = useState<
    {
      source_name: string;
      amount: number;
      date_iso: string;
      selected: boolean;
    }[]
  >([]);

  useEffect(() => {
    void loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

    const [incomeRes, sourcesRes, billsRes, debtsRes, spendRes] =
      await Promise.all([
        supabase
          .from("income_entries")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("income_sources")
          .select("*")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),

        supabase
          .from("bills")
          .select("id, target, monthly_target")
          .eq("user_id", user.id),

        supabase
          .from("debts")
          .select("id, min_payment, monthly_min_payment")
          .eq("user_id", user.id),

        supabase
          .from("spend_entries")
          .select("id, amount, date_iso, created_at")
          .eq("user_id", user.id)
          .order("created_at", { ascending: false }),
      ]);

    if (incomeRes.error) setMessage(incomeRes.error.message);
    if (sourcesRes.error) setMessage(sourcesRes.error.message);
    if (billsRes.error) setMessage(billsRes.error.message);
    if (debtsRes.error) setMessage(debtsRes.error.message);
    if (spendRes.error) setMessage(spendRes.error.message);

    setEntries((incomeRes.data || []) as IncomeEntry[]);
    setIncomeSources((sourcesRes.data || []) as IncomeSource[]);
    setBills((billsRes.data || []) as BillRow[]);
    setDebts((debtsRes.data || []) as DebtRow[]);
    setSpendEntries((spendRes.data || []) as SpendRow[]);

    setLoading(false);
  }

  function showMsg(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  }

  function resetIncomeSourceForm() {
    setSourceName("");
    setSourceType("hourly");
    setSourceHourlyRateInput("");
    setSourceHoursPerWeek("");
    setSourceWeeklyAmount("");
    setSourceAnnualSalary("");
    setSourceMonthlyAmount("");
    setSourceNote("");
  }

  async function handleAddIncomeSource() {
    if (!userId) {
      playError();
      showMsg("Not signed in.");
      return;
    }

    if (!sourceName.trim()) {
      playError();
      showMsg("Enter an income source name.");
      return;
    }

    const hourlyRate = clampMoney(sourceHourlyRateInput);
    const hoursPerWeek = safeNum(sourceHoursPerWeek);
    const weeklyAmount = clampMoney(sourceWeeklyAmount);
    const annualSalary = clampMoney(sourceAnnualSalary);
    const monthlyAmount = clampMoney(sourceMonthlyAmount);

    if (sourceType === "salary" && (annualSalary <= 0 || hoursPerWeek <= 0)) {
      playError();
      showMsg("Enter annual salary and average hours per week.");
      return;
    }

    if (sourceType === "weekly" && weeklyAmount <= 0) {
      playError();
      showMsg("Enter the weekly amount.");
      return;
    }

    if (sourceType === "monthly" && monthlyAmount <= 0) {
      playError();
      showMsg("Enter the monthly amount.");
      return;
    }

    if (
      sourceType !== "salary" &&
      sourceType !== "weekly" &&
      sourceType !== "monthly"
    ) {
      if (hourlyRate <= 0 || hoursPerWeek <= 0) {
        playError();
        showMsg("Enter rate and average hours per week.");
        return;
      }
    }

    setSaving(true);

    const { error } = await supabase.from("income_sources").insert({
      user_id: userId,
      name: sourceName.trim(),
      income_type: sourceType,
      hourly_rate: hourlyRate || null,
      hours_per_week: hoursPerWeek || null,
      weekly_amount: weeklyAmount || null,
      annual_salary: annualSalary || null,
      monthly_amount: monthlyAmount || null,
      active: true,
      note: sourceNote.trim() || null,
    });

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCoins();
    resetIncomeSourceForm();
    showMsg("Income source added to Franklin's Employment Ledger.");
    await loadData();
  }

  async function handleDeleteIncomeSource(id: string) {
    if (!userId) return;

    const ok = window.confirm("Delete this income source?");
    if (!ok) return;

    const { error } = await supabase
      .from("income_sources")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    setIncomeSources((prev) => prev.filter((item) => item.id !== id));
    showMsg("Income source removed.");
  }

  async function handleScanIncome() {
    if (!imageFile) {
      showMsg("Choose an income screenshot or deposit proof first.");
      return;
    }

    setScanning(true);
    showMsg("Ben is reading every income line…");

    try {
      const { text } = await ocrImageFile(imageFile);
      const parsed = parseTransactionsScreenshot(text);

      const incomeRows = parsed
        .map((row) => ({
          source_name: row.merchant || "Income",
          amount: Math.abs(clampMoney(row.amount)),
          date_iso:
            row.dateText && /^\d{4}-\d{2}-\d{2}$/.test(row.dateText)
              ? row.dateText
              : date,
          selected: true,
        }))
        .filter((row) => row.amount > 0);

      if (incomeRows.length === 0) {
        showMsg("No clear income lines found. Open Record Income and enter it manually.");
        setDrawer("record");
        return;
      }

      setScanRows(incomeRows);
      setDrawer("scan");
      showMsg(`Ben found ${incomeRows.length} income lines. Review before importing.`);
    } catch (error) {
      console.error(error);
      showMsg("Scanner had trouble reading that image. Manual entry still works.");
      setDrawer("record");
    } finally {
      setScanning(false);
    }
  }

  async function importScannedIncome() {
    if (!userId) {
      showMsg("Not signed in.");
      return;
    }

    const selectedRows = scanRows.filter((row) => row.selected);

    if (selectedRows.length === 0) {
      showMsg("Select at least one income line.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("income_entries").insert(
      selectedRows.map((row) => ({
        user_id: userId,
        source_name: row.source_name,
        amount: row.amount,
        date_iso: row.date_iso,
        note: "Imported from scanner",
      }))
    );

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCoins();
    setScanRows([]);
    setImageFile(null);
    showMsg(`${selectedRows.length} income lines imported.`);
    await loadData();
  }

  async function handleAddIncome() {
    const amt = clampMoney(amount);

    if (amt <= 0) {
      playError();
      showMsg("Enter a valid income amount.");
      return;
    }

    if (!source.trim()) {
      playError();
      showMsg("Enter who paid you or the income source.");
      return;
    }

    if (!userId) {
      playError();
      showMsg("Not signed in.");
      return;
    }

    const incomeNote = [
      category ? `Category: ${category}` : "",
      hoursWorked ? `Hours: ${hoursWorked}` : "",
    ]
      .filter(Boolean)
      .join(" • ");

    setSaving(true);

    const { error } = await supabase.from("income_entries").insert({
      user_id: userId,
      source_name: source.trim(),
      amount: amt,
      date_iso: date,
      note: incomeNote || null,
    });

    setSaving(false);

    if (error) {
      playError();
      showMsg(error.message);
      return;
    }

    playCoins();
    setAmount("");
    setSource("");
    setHoursWorked("");
    setImageFile(null);
    setDrawer(null);
    showMsg("Income recorded in Franklin's ledger.");
    await loadData();
  }

  const thisMonth = monthPrefix(currentMonthStartISO());

  const thisMonthEntries = useMemo(
    () => entries.filter((entry) => monthPrefix(entryDate(entry)) === thisMonth),
    [entries, thisMonth]
  );

  const thisMonthTotal = useMemo(
    () => addMoney(thisMonthEntries.map((entry) => entry.amount)),
    [thisMonthEntries]
  );

  const monthlyBillsTotal = useMemo(
    () => addMoney(bills.map((bill) => bill.monthly_target ?? bill.target)),
    [bills]
  );

  const monthlyDebtMinimums = useMemo(
    () => addMoney(debts.map((debt) => debt.monthly_min_payment ?? debt.min_payment)),
    [debts]
  );

  const thisMonthSpendEntries = useMemo(
    () =>
      spendEntries.filter((entry) => monthPrefix(spendDate(entry)) === thisMonth),
    [spendEntries, thisMonth]
  );

  const thisMonthSpending = useMemo(
    () => addMoney(thisMonthSpendEntries.map((entry) => entry.amount)),
    [thisMonthSpendEntries]
  );

  const avgMonthlySpending = useMemo(() => {
    if (!spendEntries.length) return 0;

    const monthMap = new Map<string, number>();

    spendEntries.forEach((entry) => {
      const key = monthPrefix(spendDate(entry));
      const current = monthMap.get(key) || 0;
      monthMap.set(key, current + clampMoney(entry.amount));
    });

    const totals = Array.from(monthMap.values());
    return totals.length ? addMoney(totals) / totals.length : 0;
  }, [spendEntries]);

  const spendingNeed = Math.max(avgMonthlySpending, thisMonthSpending);

  const monthlyNeed = Math.max(
    0,
    monthlyBillsTotal + monthlyDebtMinimums + spendingNeed
  );

  const remainingIncomeNeeded = Math.max(0, monthlyNeed - thisMonthTotal);
  const leftAfterNeed = Math.max(0, thisMonthTotal - monthlyNeed);

  const activeSources = useMemo(
    () => incomeSources.filter((item) => item.active !== false),
    [incomeSources]
  );

  const projectedMonthly = useMemo(
    () => addMoney(activeSources.map(projectedMonthlyIncome)),
    [activeSources]
  );

  const projectedWeekly = useMemo(
    () => addMoney(activeSources.map(projectedWeeklyIncome)),
    [activeSources]
  );

  const projectedGap = Math.max(0, monthlyNeed - projectedMonthly);
  const projectedSurplus = Math.max(0, projectedMonthly - monthlyNeed);

  const hourlyNeeded = useMemo(
    () =>
      HOURLY_TARGETS.map((weeklyHours) => ({
        hours: weeklyHours,
        hourly:
          weeklyHours > 0
            ? monthlyNeed / (weeklyHours * WEEKS_PER_MONTH)
            : 0,
      })),
    [monthlyNeed]
  );

  const catchUpHourlyNeeded = useMemo(
    () =>
      HOURLY_TARGETS.map((weeklyHours) => ({
        hours: weeklyHours,
        hourly:
          weeklyHours > 0
            ? remainingIncomeNeeded / (weeklyHours * WEEKS_PER_MONTH)
            : 0,
      })),
    [remainingIncomeNeeded]
  );

  const avgHourly = useMemo(() => {
    const fromEntries = thisMonthEntries
      .map((entry) => ({
        amount: clampMoney(entry.amount),
        hours: readHoursFromNote(entry.note),
      }))
      .filter((entry) => entry.amount > 0 && entry.hours > 0);

    const entryIncome = addMoney(fromEntries.map((entry) => entry.amount));
    const entryHours = fromEntries.reduce((sum, entry) => sum + entry.hours, 0);

    if (entryHours > 0) return entryIncome / entryHours;

    const rates = activeSources.map(getSourceHourlyRate).filter((rate) => rate > 0);
    if (rates.length === 0) return 0;

    return addMoney(rates) / rates.length;
  }, [thisMonthEntries, activeSources]);

  const todayGoal = Math.ceil(remainingIncomeNeeded / 7);
  const weeklyGoal = Math.ceil(remainingIncomeNeeded / WEEKS_PER_MONTH);

  const allTimeTotal = useMemo(
    () => addMoney(entries.map((entry) => entry.amount)),
    [entries]
  );

  const avgMonthly = useMemo(() => {
    if (!entries.length) return 0;
    const months = new Set(entries.map((entry) => monthPrefix(entryDate(entry))));
    return clampMoney(allTimeTotal / Math.max(months.size, 1));
  }, [entries, allTimeTotal]);

  const sourcesCount = useMemo(
    () => new Set(entries.map((entry) => entry.source_name || "other")).size,
    [entries]
  );

  const chartData = useMemo(() => {
    return Array.from({ length: 6 }, (_, index) => {
      const [year, month] = thisMonth.split("-").map(Number);
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
            .filter((entry) => monthPrefix(entryDate(entry)) === key)
            .map((entry) => entry.amount)
        ),
        current: index === 5,
      };
    });
  }, [entries, thisMonth]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income Room",
    totalNeeded: monthlyNeed,
    incomeSoFar: thisMonthTotal,
    incomeGap: remainingIncomeNeeded,
    dailyIncomeNeeded: todayGoal,
  });

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-cinzel text-[#c9a84c]">
          Opening Franklin&apos;s Bank…
        </p>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-black text-[#f5e6c8]"
      style={{ fontFamily: "EB Garamond, serif" }}
    >
      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-5xl">
        <div
          className="px-4 py-3 text-center"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.98), rgba(15,8,4,.92))",
            borderBottom: "1px solid rgba(201,168,76,.25)",
          }}
        >
          <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-[#c9a84c]">
            Franklin&apos;s Landing
          </p>
          <h1 className="font-cinzel text-2xl font-bold tracking-wide text-[#f5e6c8] sm:text-4xl">
            Franklin&apos;s Bank of Income
          </h1>
        </div>

        <img
          src={BANK_BG}
          alt="Franklin's Bank of Income"
          className="block h-auto w-full"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <button
          onClick={() => router.push("/world")}
          className="absolute left-4 top-20 rounded-full px-4 py-2 text-sm sm:top-24"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          ← Back to Town
        </button>

        <button
          onClick={() => setShowBenNotice(true)}
          className="absolute right-4 top-20 rounded-full px-4 py-2 text-sm sm:top-24"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          Ben&apos;s Notice
        </button>
      </section>

      {/* ── Main content ── */}
      <section className="relative z-10 mx-auto -mt-2 max-w-5xl px-4 pb-24 sm:-mt-8">
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,5,3,.94), rgba(0,0,0,.99))",
            border: "1px solid rgba(201,168,76,.35)",
            boxShadow: "0 -30px 80px rgba(0,0,0,.9)",
          }}
        >
          {/* ── Notice banner ── */}
          {message && (
            <p className="mb-4 rounded-xl bg-[#c9a84c]/20 px-4 py-3 text-center text-[#f5e6c8]">
              {message}
            </p>
          )}

          {/* ── Top stats ── */}
          <div
            className="mb-5 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
            style={{
              border: "1px solid rgba(201,168,76,.4)",
              background: "rgba(0,0,0,.58)",
            }}
          >
            <Metric icon="🪙" label="Earned This Month" value={money(thisMonthTotal)} color="#4ade80" />
            <Metric icon="🎯" label="Still Need" value={money(remainingIncomeNeeded)} color={remainingIncomeNeeded > 0 ? "#ef4444" : "#c9a84c"} />
            <Metric icon="🏦" label="Monthly Need" value={money(monthlyNeed)} color={monthlyNeed > thisMonthTotal ? "#ef4444" : "#c9a84c"} />
            <Metric icon="📈" label="Planned Income" value={money(projectedMonthly)} color={projectedMonthly >= monthlyNeed && monthlyNeed > 0 ? "#4ade80" : "#c9a84c"} />
          </div>

          {/* ── Ben's briefing ── */}
          <Card title="Ben's Bank Briefing" sub="Need is based on outgoing money. Planned income is based on saved income sources. Earned income is what you actually recorded.">
            <BenBubble message={benInsight.text} mood={benInsight.mood} />
          </Card>

          {/* ── Monthly need breakdown ── */}
          <Card title="Monthly Need" sub="This is what the household needs based on bills, debt minimums, and live/historical spending.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon="📋" label="Bills" value={money(monthlyBillsTotal)} />
              <StatTile icon="💳" label="Debt Minimums" value={money(monthlyDebtMinimums)} />
              <StatTile icon="🛒" label="Spending Need" value={money(spendingNeed)} />
              <StatTile icon="🏦" label="Monthly Need" value={money(monthlyNeed)} />
            </div>
          </Card>

          {/* ── Income plan ── */}
          <Card title="Can My Income Plan Cover It?" sub="Income sources are planning numbers. They show whether your expected work and average income can cover the outgoing need.">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <StatTile icon="📈" label="Projected Weekly" value={money(projectedWeekly)} />
              <StatTile icon="💼" label="Projected Monthly" value={money(projectedMonthly)} color={projectedMonthly >= monthlyNeed && monthlyNeed > 0 ? "#4ade80" : undefined} />
              <StatTile icon="🚨" label="Plan Gap" value={money(projectedGap)} color={projectedGap > 0 ? "#ef4444" : undefined} />
              <StatTile icon="🌿" label="Plan Surplus" value={money(projectedSurplus)} color={projectedSurplus > 0 ? "#4ade80" : undefined} />
            </div>

            <div
              className="mt-4 rounded-2xl p-5 text-center"
              style={{
                background: "rgba(0,0,0,.48)",
                border: "1px solid rgba(201,168,76,.25)",
              }}
            >
              {projectedGap > 0 ? (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] font-bold text-[#d6c09a]">Income Plan Short</p>
                  <p className="mt-2 text-5xl font-bold text-[#ef4444]">{money(projectedGap)}</p>
                  <p className="mt-3 text-[#e8d5b7]">Ben says: add another source, raise hours, or lower outgoing money.</p>
                </>
              ) : (
                <>
                  <p className="text-xs uppercase tracking-[0.18em] font-bold text-[#d6c09a]">Income Plan Covers Need</p>
                  <p className="mt-2 text-5xl font-bold text-[#4ade80]">{money(projectedSurplus)}</p>
                  <p className="mt-3 text-[#e8d5b7]">Your saved income sources are projected to cover the monthly need.</p>
                </>
              )}
            </div>
          </Card>

          {/* ── Hourly rate calculator ── */}
          <Card title="How Much Per Hour?" sub="Required hourly rate based on weekly work hours. This does not go down when income is recorded.">
            <div className="grid grid-cols-3 gap-3 sm:grid-cols-5">
              {hourlyNeeded.map((item) => (
                <div
                  key={item.hours}
                  className="rounded-2xl p-4 text-center"
                  style={{
                    background: "rgba(0,0,0,.55)",
                    border: `1px solid ${item.hourly <= 20 ? "rgba(74,222,128,.4)" : item.hourly <= 35 ? "rgba(250,204,21,.4)" : "rgba(248,113,113,.4)"}`,
                  }}
                >
                  <p className="text-xs uppercase tracking-wider text-[#d6c09a]">{item.hours} hrs/wk</p>
                  <p
                    className="mt-2 text-lg font-bold"
                    style={{
                      color: item.hourly <= 20 ? "#4ade80" : item.hourly <= 35 ? "#facc15" : "#f87171",
                    }}
                  >
                    {money(item.hourly)}/hr
                  </p>
                </div>
              ))}
            </div>
          </Card>

          {/* ── Drawer action buttons ── */}
          <div className="my-5 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {(
              [
                { key: "record", label: "+ Record Income", danger: false },
                { key: "sources", label: "💼 Income Sources", danger: false },
                { key: "scan", label: "📸 Scan Deposit", danger: false },
                { key: "hourly", label: "🚨 Need Money Fast", danger: true },
              ] as const
            ).map(({ key, label, danger }) => (
              <button
                key={key}
                onClick={() => setDrawer(drawer === key ? null : key)}
                className="rounded-xl py-4 font-cinzel text-base"
                style={{
                  background:
                    drawer === key
                      ? danger
                        ? "rgba(185,28,28,.55)"
                        : "linear-gradient(180deg, rgba(201,168,76,.42), rgba(70,40,10,.45))"
                      : danger
                      ? "rgba(127,29,29,.35)"
                      : "rgba(0,0,0,.45)",
                  border:
                    drawer === key
                      ? danger
                        ? "1px solid rgba(248,113,113,.85)"
                        : "1px solid rgba(251,191,36,.85)"
                      : danger
                      ? "1px solid rgba(248,113,113,.45)"
                      : "1px solid rgba(201,168,76,.35)",
                  color: drawer === key ? "#f5e6c8" : danger ? "#fca5a5" : "#c9a84c",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Record Income drawer ── */}
          {drawer === "record" && (
            <DrawerPanel title="Record Income" sub="This is actual money received this month.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Amount" value={amount} onChange={setAmount} type="number" />
                <Input label="Paid By / Source" value={source} onChange={setSource} placeholder="DoorDash, employer, client..." />
                <SelectInput
                  label="Category"
                  value={category}
                  onChange={setCategory}
                  options={CATEGORIES.map((cat) => ({ value: cat.value, label: `${cat.icon} ${cat.label}` }))}
                />
                <Input label="Hours Worked" value={hoursWorked} onChange={setHoursWorked} type="number" placeholder="Optional" />
                <Input label="Date" value={date} onChange={setDate} type="date" />
                <button
                  onClick={() => void handleAddIncome()}
                  disabled={saving}
                  className="rounded-xl bg-green-800 py-3 font-bold disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Recording…" : "💰 Save Income"}
                </button>
              </div>
            </DrawerPanel>
          )}

          {/* ── Income Sources drawer ── */}
          {drawer === "sources" && (
            <DrawerPanel title="Income Sources" sub="These are planning sources. Use hourly, weekly, monthly, or salary.">
              <div className="grid gap-3 sm:grid-cols-2">
                <Input label="Source Name" value={sourceName} onChange={setSourceName} placeholder="DoorDash, WDI, Salon..." />
                <SelectInput
                  label="Income Type"
                  value={sourceType}
                  onChange={(v) => setSourceType(v as IncomeSource["income_type"])}
                  options={[
                    { value: "hourly", label: "Hourly / Gig Hourly" },
                    { value: "weekly", label: "Weekly Fixed" },
                    { value: "monthly", label: "Monthly Fixed" },
                    { value: "salary", label: "Salary" },
                    { value: "project", label: "Project / Average Rate" },
                    { value: "commission", label: "Commission / Average Rate" },
                    { value: "gig", label: "Gig / Average Rate" },
                  ]}
                />

                {sourceType === "salary" ? (
                  <>
                    <Input label="Annual Salary" value={sourceAnnualSalary} onChange={setSourceAnnualSalary} type="number" placeholder="50000" />
                    <Input label="Average Hours / Week" value={sourceHoursPerWeek} onChange={setSourceHoursPerWeek} type="number" placeholder="40" />
                  </>
                ) : sourceType === "weekly" ? (
                  <Input label="Weekly Amount" value={sourceWeeklyAmount} onChange={setSourceWeeklyAmount} type="number" placeholder="700" />
                ) : sourceType === "monthly" ? (
                  <Input label="Monthly Amount" value={sourceMonthlyAmount} onChange={setSourceMonthlyAmount} type="number" placeholder="3000" />
                ) : (
                  <>
                    <Input label="Hourly / Average Rate" value={sourceHourlyRateInput} onChange={setSourceHourlyRateInput} type="number" placeholder="18" />
                    <Input label="Average Hours / Week" value={sourceHoursPerWeek} onChange={setSourceHoursPerWeek} type="number" placeholder="20" />
                  </>
                )}

                <Input label="Note" value={sourceNote} onChange={setSourceNote} placeholder="Optional" />

                <button
                  onClick={() => void handleAddIncomeSource()}
                  disabled={saving}
                  className="rounded-xl bg-green-800 py-3 font-bold disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Saving…" : "Save Income Source"}
                </button>
              </div>

              {/* Existing sources list */}
              <div className="mt-4 grid gap-2">
                {incomeSources.length === 0 ? (
                  <p className="text-center text-[#9a7d5a]">No income sources added yet.</p>
                ) : (
                  incomeSources.map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,.04)",
                        border: "1px solid rgba(201,168,76,.18)",
                      }}
                    >
                      <div>
                        <p className="font-bold">{item.name}</p>
                        <p className="text-sm text-[#9a7d5a]">
                          {item.income_type} · {money(projectedWeeklyIncome(item))}/week · {money(projectedMonthlyIncome(item))}/month
                        </p>
                      </div>
                      <button
                        onClick={() => void handleDeleteIncomeSource(item.id)}
                        className="rounded-xl px-3 py-2 text-sm font-bold"
                        style={{
                          background: "rgba(127,29,29,.35)",
                          border: "1px solid rgba(248,113,113,.45)",
                          color: "#fecaca",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  ))
                )}
              </div>
            </DrawerPanel>
          )}

          {/* ── Scan drawer ── */}
          {drawer === "scan" && (
            <DrawerPanel title="Scan Income Proof" sub="Upload a DoorDash screenshot, paycheck, deposit, or income proof.">
              <PaperScrollScanner
                title="Scan Income Proof"
                description="Ben will fill what he can. Review it before saving."
                file={imageFile}
                busy={scanning}
                onFileChange={setImageFile}
                onScan={() => void handleScanIncome()}
              />

              {scanRows.length > 0 && (
                <div className="mt-4 grid gap-2">
                  {scanRows.map((row, index) => (
                    <label
                      key={index}
                      className="flex items-center justify-between rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,.04)",
                        border: "1px solid rgba(201,168,76,.18)",
                      }}
                    >
                      <span className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          checked={row.selected}
                          onChange={(e) =>
                            setScanRows((prev) =>
                              prev.map((item, i) =>
                                i === index ? { ...item, selected: e.target.checked } : item
                              )
                            )
                          }
                        />
                        {row.source_name}
                      </span>
                      <strong className="text-[#4ade80]">{money(row.amount)}</strong>
                    </label>
                  ))}

                  <button
                    onClick={() => void importScannedIncome()}
                    disabled={saving}
                    className="mt-2 rounded-xl bg-green-800 py-3 font-bold disabled:opacity-50"
                  >
                    {saving ? "Importing…" : "Import Selected Income"}
                  </button>
                </div>
              )}
            </DrawerPanel>
          )}

          {/* ── Need Money Fast drawer ── */}
          {drawer === "hourly" && (
            <DrawerPanel title="Need Money Fast" sub="This shows what is still left to earn this month.">
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                <StatTile icon="☀️" label="Today Goal" value={money(todayGoal)} />
                <StatTile icon="🗓️" label="Weekly Goal" value={money(weeklyGoal)} />
                <StatTile icon="📈" label="Projected Weekly" value={money(projectedWeekly)} />
                <StatTile icon="🎯" label="Still Need" value={money(remainingIncomeNeeded)} color={remainingIncomeNeeded > 0 ? "#ef4444" : undefined} />
              </div>

              <div className="mt-4 grid grid-cols-3 gap-3 sm:grid-cols-5">
                {catchUpHourlyNeeded.map((item) => (
                  <div
                    key={item.hours}
                    className="rounded-2xl p-4 text-center"
                    style={{
                      background: "rgba(0,0,0,.55)",
                      border: "1px solid rgba(201,168,76,.25)",
                    }}
                  >
                    <p className="text-xs uppercase tracking-wider text-[#d6c09a]">{item.hours} hrs/wk</p>
                    <p className="mt-2 text-lg font-bold text-[#c9a84c]">{money(item.hourly)}/hr</p>
                  </div>
                ))}
              </div>
            </DrawerPanel>
          )}

          {/* ── Income chart ── */}
          <Card title="Income This Month">
            <p className="text-5xl font-bold text-[#4ade80]">{money(thisMonthTotal)}</p>

            <div className="mt-4 h-48">
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
                    formatter={(value: number) => [money(value), "Income"]}
                  />
                  <Bar dataKey="total" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={index} fill={entry.current ? "#c9a84c" : "#4a5568"} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            <div
              className="mt-4 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
              style={{
                border: "1px solid rgba(201,168,76,.4)",
                background: "rgba(0,0,0,.58)",
              }}
            >
              <Metric icon="📈" label="Average Month" value={money(avgMonthly)} />
              <Metric icon="📜" label="Entries" value={String(entries.length)} />
              <Metric icon="👥" label="Recorded Sources" value={String(sourcesCount)} />
              <Metric icon="💼" label="Saved Sources" value={String(incomeSources.length)} />
            </div>
          </Card>

          {/* ── Recent income ── */}
          <Card title="Recent Income">
            <div className="mt-2 grid gap-2">
              {entries.slice(0, 8).length === 0 ? (
                <p className="text-center text-[#9a7d5a]">No income entries yet.</p>
              ) : (
                entries.slice(0, 8).map((entry) => {
                  const cat =
                    CATEGORIES.find((item) => entry.note?.includes(`Category: ${item.value}`)) ||
                    CATEGORIES[5];

                  return (
                    <div
                      key={entry.id}
                      className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                      style={{
                        background: "rgba(255,255,255,.04)",
                        border: "1px solid rgba(201,168,76,.18)",
                      }}
                    >
                      <div className="flex items-center gap-3">
                        <span className="text-2xl">{cat.icon}</span>
                        <div>
                          <p className="font-bold">{entry.source_name || cat.label}</p>
                          <p className="text-sm text-[#9a7d5a]">{entryDate(entry)}</p>
                        </div>
                      </div>
                      <strong className="text-xl text-[#4ade80]">{money(entry.amount)}</strong>
                    </div>
                  );
                })
              )}
            </div>
          </Card>

          <p className="mt-6 text-center italic text-[#c9a84c]">
            &ldquo;Diligence is the mother of good luck.&rdquo; — Benjamin Franklin
          </p>
        </div>
      </section>

      {/* ── Ben's Notice modal ── */}
      {showBenNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div
            className="max-w-md rounded-3xl p-5"
            style={{
              background: "#fff7df",
              border: "2px solid #c9a84c",
              color: "#1a0f0a",
              boxShadow: "0 30px 80px rgba(0,0,0,.7)",
            }}
          >
            <div className="flex gap-3">
              <img
                src="/ben.png"
                alt="Ben"
                className="h-16 w-16 rounded-xl border border-[#c9a84c] object-cover"
              />
              <div>
                <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#8a3a12]">
                  Ben&apos;s Almanack
                </p>
                <p className="mt-2 text-lg font-bold leading-snug">
                  {benInsight.text}
                </p>
                <p className="mt-3 text-sm">
                  You have recorded {entries.length} income entries across {sourcesCount} sources this session.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBenNotice(false)}
              className="mt-5 w-full rounded-xl py-3 font-bold"
              style={{ background: "#1a0f0a", color: "#f5e6c8" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Shared layout helpers ────────────────────────────────────────────

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-4 rounded-2xl p-4"
      style={{
        background: "rgba(15,8,4,.9)",
        border: "1px solid rgba(201,168,76,.35)",
      }}
    >
      <h2 className="font-cinzel text-xl font-bold text-[#c9a84c]">{title}</h2>
      {sub && <p className="mb-4 mt-1 text-sm text-[#b99b60]">{sub}</p>}
      <div className={sub ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function DrawerPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-4 rounded-2xl p-4"
      style={{
        background: "rgba(15,8,4,.9)",
        border: "1px solid rgba(201,168,76,.35)",
      }}
    >
      <h3 className="font-cinzel text-xl font-bold text-[#c9a84c]">{title}</h3>
      {sub && <p className="mb-4 mt-1 text-sm text-[#b99b60]">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  color = "#c9a84c",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border-b border-[#c9a84c]/20 p-4 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#d6c09a]">
        {label}
      </p>
      <p className="mt-1 text-2xl font-bold" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  color,
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: "rgba(0,0,0,.45)",
        border: "1px solid rgba(201,168,76,.25)",
      }}
    >
      <p className="text-xl">{icon}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-[#d6c09a]">{label}</p>
      <p className="mt-1 text-lg font-bold" style={{ color: color ?? "#c9a84c" }}>
        {value}
      </p>
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">
        {label}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg px-3 py-2 text-black"
        style={{ background: "#f5e6c8" }}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-black"
        style={{ background: "#f5e6c8" }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
