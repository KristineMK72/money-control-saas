"use client";

import { useEffect, useMemo, useState } from "react";
import BankHero from "@/components/income/BankHero";
import RoomCard from "@/components/income/RoomCard";
import MiniMetric from "@/components/income/MiniMetric";
import DrawerButton from "@/components/income/DrawerButton";
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

type IncomeEntry = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number | string | null;
  date_iso: string;
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

type Drawer = "record" | "scan" | "plan" | "hourly" | null;

const CATEGORIES = [
  { value: "employment", label: "Employment", icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services", label: "Services", icon: "📋" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "gifts", label: "Gifts", icon: "🎁" },
  { value: "other", label: "Other", icon: "💰" },
];

const HOURLY_TARGETS = [40, 30, 20, 10, 5];

function safeNum(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function entryDate(entry: IncomeEntry) {
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

export default function IncomePage() {
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [message, setMessage] = useState("");

  const [drawer, setDrawer] = useState<Drawer>("record");

  const [amount, setAmount] = useState("");
  const [source, setSource] = useState("");
  const [category, setCategory] = useState("employment");
  const [hoursWorked, setHoursWorked] = useState("");
  const [date, setDate] = useState(todayLocalISO());

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

    const [incomeRes, billsRes, debtsRes] = await Promise.all([
      supabase
        .from("income_entries")
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
    ]);

    if (incomeRes.error) setMessage(incomeRes.error.message);
    if (billsRes.error) setMessage(billsRes.error.message);
    if (debtsRes.error) setMessage(debtsRes.error.message);

    setEntries((incomeRes.data || []) as IncomeEntry[]);
    setBills((billsRes.data || []) as BillRow[]);
    setDebts((debtsRes.data || []) as DebtRow[]);

    setLoading(false);
  }

  async function handleScanIncome() {
    if (!imageFile) {
      setMessage("Choose an income screenshot or deposit proof first.");
      return;
    }

    setScanning(true);
    setMessage("Ben is reading every income line…");

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
        setMessage(
          "No clear income lines found. Open Record Income and enter it manually."
        );
        setDrawer("record");
        return;
      }

      setScanRows(incomeRows);
      setDrawer("scan");
      setMessage(
        `Ben found ${incomeRows.length} income lines. Review before importing.`
      );
    } catch (error) {
      console.error(error);
      setMessage("Scanner had trouble reading that image. Manual entry still works.");
      setDrawer("record");
    } finally {
      setScanning(false);
    }
  }
  type IncomeSource = {
  id: string;
  user_id: string;
  name: string;
  income_type:
    | "hourly"
    | "salary"
    | "monthly"
    | "project"
    | "commission"
    | "gig";
  hourly_rate: number | string | null;
  hours_per_week: number | string | null;
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

type Drawer = "record" | "scan" | "plan" | "hourly" | "sources" | null;

const CATEGORIES = [
  { value: "employment", label: "Employment", icon: "🏛" },
  { value: "entrepreneurship", label: "Entrepreneurship", icon: "⚙️" },
  { value: "services", label: "Services", icon: "📋" },
  { value: "investments", label: "Investments", icon: "📈" },
  { value: "gifts", label: "Gifts", icon: "🎁" },
  { value: "other", label: "Other", icon: "💰" },
];

const HOURLY_TARGETS = [40, 30, 20, 10, 5];

function safeNum(value: unknown) {
  const n = Number(value ?? 0);
  return Number.isFinite(n) ? n : 0;
}

function entryDate(entry: IncomeEntry) {
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
  const annualSalary = clampMoney(source.annual_salary);
  const monthlyAmount = clampMoney(source.monthly_amount);

  if (source.income_type === "salary") return annualSalary / 12;
  if (source.income_type === "monthly") return monthlyAmount;

  return hourlyRate * hoursPerWeek * 4.333;
}

function projectedWeeklyIncome(source: IncomeSource) {
  return projectedMonthlyIncome(source) / 4.333;
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
  const [supabase] = useState(() => createSupabaseBrowserClient());

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);

  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [incomeSources, setIncomeSources] = useState<IncomeSource[]>([]);
  const [message, setMessage] = useState("");

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

    const [incomeRes, billsRes, debtsRes, sourcesRes] = await Promise.all([
      supabase
        .from("income_entries")
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
        .from("income_sources")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false }),
    ]);

    if (incomeRes.error) setMessage(incomeRes.error.message);
    if (billsRes.error) setMessage(billsRes.error.message);
    if (debtsRes.error) setMessage(debtsRes.error.message);
    if (sourcesRes.error) setMessage(sourcesRes.error.message);

    setEntries((incomeRes.data || []) as IncomeEntry[]);
    setBills((billsRes.data || []) as BillRow[]);
    setDebts((debtsRes.data || []) as DebtRow[]);
    setIncomeSources((sourcesRes.data || []) as IncomeSource[]);

    setLoading(false);
  }

  function resetIncomeSourceForm() {
    setSourceName("");
    setSourceType("hourly");
    setSourceHourlyRateInput("");
    setSourceHoursPerWeek("");
    setSourceAnnualSalary("");
    setSourceMonthlyAmount("");
    setSourceNote("");
  }

  async function handleAddIncomeSource() {
    setMessage("");

    if (!userId) {
      playError();
      setMessage("Not signed in.");
      return;
    }

    if (!sourceName.trim()) {
      playError();
      setMessage("Enter an income source name.");
      return;
    }

    const hourlyRate = clampMoney(sourceHourlyRateInput);
    const hoursPerWeek = safeNum(sourceHoursPerWeek);
    const annualSalary = clampMoney(sourceAnnualSalary);
    const monthlyAmount = clampMoney(sourceMonthlyAmount);

    if (sourceType === "salary") {
      if (annualSalary <= 0 || hoursPerWeek <= 0) {
        playError();
        setMessage("Enter annual salary and average hours per week.");
        return;
      }
    }

    if (sourceType === "monthly") {
      if (monthlyAmount <= 0) {
        playError();
        setMessage("Enter the monthly amount.");
        return;
      }
    }

    if (sourceType !== "salary" && sourceType !== "monthly") {
      if (hourlyRate <= 0 || hoursPerWeek <= 0) {
        playError();
        setMessage("Enter hourly rate and average hours per week.");
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
      annual_salary: annualSalary || null,
      monthly_amount: monthlyAmount || null,
      active: true,
      note: sourceNote.trim() || null,
    });

    setSaving(false);

    if (error) {
      playError();
      setMessage(error.message);
      return;
    }

    playCoins();
    resetIncomeSourceForm();
    setMessage("Income source added to Franklin’s Employment Ledger.");
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
      setMessage(error.message);
      return;
    }

    setIncomeSources((prev) => prev.filter((item) => item.id !== id));
    setMessage("Income source removed.");
  }
    async function importScannedIncome() {
    if (!userId) {
      setMessage("Not signed in.");
      return;
    }

    const selectedRows = scanRows.filter((row) => row.selected);

    if (selectedRows.length === 0) {
      setMessage("Select at least one income line.");
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
      setMessage(error.message);
      return;
    }

    playCoins();
    setScanRows([]);
    setImageFile(null);
    setMessage(`${selectedRows.length} income lines imported.`);
    await loadData();
  }

  async function handleAddIncome() {
    setMessage("");

    const amt = clampMoney(amount);

    if (amt <= 0) {
      playError();
      setMessage("Enter a valid income amount.");
      return;
    }

    if (!source.trim()) {
      playError();
      setMessage("Enter who paid you or the income source.");
      return;
    }

    if (!userId) {
      playError();
      setMessage("Not signed in.");
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
      setMessage(error.message);
      return;
    }

    playCoins();
    setAmount("");
    setSource("");
    setHoursWorked("");
    setImageFile(null);
    setDrawer(null);
    setMessage("Income recorded in Franklin’s ledger.");
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

  const monthlyNeed = Math.max(0, monthlyBillsTotal + monthlyDebtMinimums);
  const remainingIncomeNeeded = Math.max(0, monthlyNeed - thisMonthTotal);
  const projectedGap = Math.max(0, monthlyNeed - projectedMonthly);
  const leftAfterNeed = Math.max(0, thisMonthTotal - monthlyNeed);

  const hourlyNeeded = useMemo(
    () =>
      HOURLY_TARGETS.map((hours) => ({
        hours,
        hourly: hours > 0 ? remainingIncomeNeeded / hours : 0,
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
  const weeklyGoal = Math.ceil(remainingIncomeNeeded / 4);

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
      <main className="bank-page loading-room">
        <p>Opening Franklin&apos;s Bank…</p>
      </main>
    );
  }

  return (
    <main className="bank-page">
      <BankHero />

      <section className="desk-wrap">
        {message && <div className="notice">{message}</div>}

        <div className="stats-grid">
          <MiniMetric icon="🪙" label="This Month" value={money(thisMonthTotal)} good />
          <MiniMetric icon="🎯" label="Need Left" value={money(remainingIncomeNeeded)} danger={remainingIncomeNeeded > 0} />
          <MiniMetric icon="📈" label="Projected Monthly" value={money(projectedMonthly)} good={projectedMonthly >= monthlyNeed && monthlyNeed > 0} />
          <MiniMetric icon="⏱️" label="Avg Hourly" value={avgHourly > 0 ? money(avgHourly) : "—"} />
        </div>

        <RoomCard>
          <h2>Ben&apos;s Bank Briefing</h2>
          <p className="card-sub">Income, monthly obligations, and the fastest way to close the gap.</p>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </RoomCard>

        <RoomCard>
          <h2>Income Needed Breakdown</h2>
          <p className="card-sub">This uses bills + debt minimums, not extra spending, so the hourly number stays consistent.</p>

          <div className="plan-grid">
            <MiniMetric icon="📋" label="Bills" value={money(monthlyBillsTotal)} />
            <MiniMetric icon="💳" label="Debt Minimums" value={money(monthlyDebtMinimums)} />
            <MiniMetric icon="🏦" label="Monthly Need" value={money(monthlyNeed)} />
            <MiniMetric icon="💼" label="Projected Gap" value={money(projectedGap)} danger={projectedGap > 0} />
          </div>

          <div className="gap-box">
            {remainingIncomeNeeded > 0 ? (
              <>
                <p className="gap-eyebrow">Still Need This Month</p>
                <p className="gap-money danger">{money(remainingIncomeNeeded)}</p>
                <p className="gap-note">Ben says: break it into hours, shifts, or services.</p>
              </>
            ) : (
              <>
                <p className="gap-eyebrow">Covered</p>
                <p className="gap-money good">{money(leftAfterNeed)}</p>
                <p className="gap-note">Your income is covering the current monthly need.</p>
              </>
            )}
          </div>
        </RoomCard>

        <RoomCard>
          <h2>How Much Per Hour?</h2>
          <p className="card-sub">What the remaining gap means at different work-hour levels.</p>

          {remainingIncomeNeeded <= 0 ? (
            <div className="covered-box">
              <strong>No extra hourly income needed right now.</strong>
              <p>The Treasury is covered based on this month&apos;s numbers.</p>
            </div>
          ) : (
            <div className="hourly-grid">
              {hourlyNeeded.map((item) => (
                <div
                  key={item.hours}
                  className={`hour-card ${
                    item.hourly <= 20 ? "good" : item.hourly <= 35 ? "warn" : "danger"
                  }`}
                >
                  <p>{item.hours} hours</p>
                  <strong>{money(item.hourly)}/hr</strong>
                </div>
              ))}
            </div>
          )}
        </RoomCard>

        <div className="drawer-buttons">
          <DrawerButton active={drawer === "record"} onClick={() => setDrawer(drawer === "record" ? null : "record")}>
            + Record Income
          </DrawerButton>

          <DrawerButton active={drawer === "sources"} onClick={() => setDrawer(drawer === "sources" ? null : "sources")}>
            💼 Income Sources
          </DrawerButton>

          <DrawerButton active={drawer === "scan"} onClick={() => setDrawer(drawer === "scan" ? null : "scan")}>
            📸 Scan Deposit
          </DrawerButton>

          <DrawerButton danger active={drawer === "hourly"} onClick={() => setDrawer(drawer === "hourly" ? null : "hourly")}>
            🚨 Need Money Fast
          </DrawerButton>
        </div>

        {drawer === "record" && (
          <RoomCard className="drawer-panel">
            <h2>Record Income</h2>
            <p className="card-sub">Earn it, name it, and put it in Franklin&apos;s ledger.</p>

            <div className="form-grid">
              <label>
                <span>Amount</span>
                <input type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="0.00" />
              </label>

              <label>
                <span>Paid By / Source</span>
                <input value={source} onChange={(e) => setSource(e.target.value)} placeholder="DoorDash, employer, client..." />
              </label>

              <label>
                <span>Category</span>
                <select value={category} onChange={(e) => setCategory(e.target.value)}>
                  {CATEGORIES.map((cat) => (
                    <option key={cat.value} value={cat.value}>{cat.icon} {cat.label}</option>
                  ))}
                </select>
              </label>

              <label>
                <span>Hours Worked</span>
                <input type="number" inputMode="decimal" value={hoursWorked} onChange={(e) => setHoursWorked(e.target.value)} placeholder="Optional" />
              </label>

              <label>
                <span>Date</span>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} />
              </label>

              <button onClick={handleAddIncome} disabled={saving} className="save-btn">
                {saving ? "Recording…" : "💰 Save Income"}
              </button>
            </div>
          </RoomCard>
        )}

        {drawer === "sources" && (
          <RoomCard className="drawer-panel">
            <h2>Franklin&apos;s Employment Ledger</h2>
            <p className="card-sub">Add hourly, salary, monthly, gig, project, or commission income.</p>

            <div className="form-grid">
              <label>
                <span>Source Name</span>
                <input value={sourceName} onChange={(e) => setSourceName(e.target.value)} placeholder="DoorDash, WDI, Salon..." />
              </label>

              <label>
                <span>Income Type</span>
                <select value={sourceType} onChange={(e) => setSourceType(e.target.value as IncomeSource["income_type"])}>
                  <option value="hourly">Hourly</option>
                  <option value="salary">Salary</option>
                  <option value="monthly">Monthly Fixed</option>
                  <option value="gig">Gig Work</option>
                  <option value="project">Per Project</option>
                  <option value="commission">Commission</option>
                </select>
              </label>

              {sourceType === "salary" ? (
                <>
                  <label>
                    <span>Annual Salary</span>
                    <input type="number" inputMode="decimal" value={sourceAnnualSalary} onChange={(e) => setSourceAnnualSalary(e.target.value)} placeholder="50000" />
                  </label>
                  <label>
                    <span>Average Hours / Week</span>
                    <input type="number" inputMode="decimal" value={sourceHoursPerWeek} onChange={(e) => setSourceHoursPerWeek(e.target.value)} placeholder="40" />
                  </label>
                </>
              ) : sourceType === "monthly" ? (
                <label>
                  <span>Monthly Amount</span>
                  <input type="number" inputMode="decimal" value={sourceMonthlyAmount} onChange={(e) => setSourceMonthlyAmount(e.target.value)} placeholder="2500" />
                </label>
              ) : (
                <>
                  <label>
                    <span>Hourly / Average Rate</span>
                    <input type="number" inputMode="decimal" value={sourceHourlyRateInput} onChange={(e) => setSourceHourlyRateInput(e.target.value)} placeholder="25" />
                  </label>
                  <label>
                    <span>Average Hours / Week</span>
                    <input type="number" inputMode="decimal" value={sourceHoursPerWeek} onChange={(e) => setSourceHoursPerWeek(e.target.value)} placeholder="10" />
                  </label>
                </>
              )}

              <label>
                <span>Note</span>
                <input value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} placeholder="Optional" />
              </label>

              <button onClick={handleAddIncomeSource} disabled={saving} className="save-btn">
                {saving ? "Saving…" : "Save Income Source"}
              </button>
            </div>

            <div className="source-list">
              {incomeSources.length === 0 ? (
                <p className="empty">No income sources added yet.</p>
              ) : (
                incomeSources.map((item) => (
                  <div key={item.id} className="source-row">
                    <div>
                      <strong>{item.name}</strong>
                      <p>
                        {item.income_type} · {money(projectedWeeklyIncome(item))}/week · {money(projectedMonthlyIncome(item))}/month
                      </p>
                    </div>

                    <button onClick={() => void handleDeleteIncomeSource(item.id)}>
                      Delete
                    </button>
                  </div>
                ))
              )}
            </div>
          </RoomCard>
        )}

        {drawer === "scan" && (
          <RoomCard className="drawer-panel">
            <h2>Scan Income Proof</h2>
            <p className="card-sub">Upload a DoorDash screenshot, paycheck, deposit, or income proof.</p>

            <PaperScrollScanner
              title="Scan Income Proof"
              description="Ben will fill what he can. Review it before saving."
              file={imageFile}
              busy={scanning}
              onFileChange={setImageFile}
              onScan={() => void handleScanIncome()}
            />

            {scanRows.length > 0 && (
              <div className="recent-list">
                {scanRows.map((row, index) => (
                  <label key={index} className="recent-row">
                    <span>
                      <input
                        type="checkbox"
                        checked={row.selected}
                        onChange={(e) => {
                          setScanRows((prev) =>
                            prev.map((item, i) =>
                              i === index ? { ...item, selected: e.target.checked } : item
                            )
                          );
                        }}
                      />{" "}
                      {row.source_name}
                    </span>
                    <strong className="amount">{money(row.amount)}</strong>
                  </label>
                ))}

                <button onClick={importScannedIncome} disabled={saving} className="save-btn">
                  {saving ? "Importing…" : "Import Selected Income"}
                </button>
              </div>
            )}
          </RoomCard>
        )}

        {drawer === "hourly" && (
          <RoomCard className="drawer-panel">
            <h2>Need Money Fast</h2>
            <p className="card-sub">Use your saved sources to choose the fastest path.</p>

            <div className="plan-grid">
              <MiniMetric icon="☀️" label="Today Goal" value={money(todayGoal)} />
              <MiniMetric icon="🗓️" label="Weekly Goal" value={money(weeklyGoal)} />
              <MiniMetric icon="📈" label="Projected Weekly" value={money(projectedWeekly)} />
              <MiniMetric icon="🎯" label="Need Left" value={money(remainingIncomeNeeded)} danger={remainingIncomeNeeded > 0} />
            </div>

            <div className="hourly-grid mini-hourly">
              {hourlyNeeded.map((item) => (
                <div key={item.hours} className="hour-card">
                  <p>{item.hours} hrs</p>
                  <strong>{money(item.hourly)}/hr</strong>
                </div>
              ))}
            </div>
          </RoomCard>
        )}

        <RoomCard>
          <div className="chart-grid">
            <div>
              <h2>Income This Month</h2>
              <p className="big-money">{money(thisMonthTotal)}</p>

              <div className="chart-box">
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
            </div>

            <div className="mini-grid">
              <MiniMetric icon="📈" label="Average Month" value={money(avgMonthly)} />
              <MiniMetric icon="📜" label="Entries" value={String(entries.length)} />
              <MiniMetric icon="👥" label="Recorded Sources" value={String(sourcesCount)} />
              <MiniMetric icon="💼" label="Saved Sources" value={String(incomeSources.length)} />
            </div>
          </div>
        </RoomCard>

        <RoomCard>
          <h2>Recent Income</h2>

          <div className="recent-list">
            {entries.slice(0, 8).length === 0 ? (
              <p className="empty">No income entries yet.</p>
            ) : (
              entries.slice(0, 8).map((entry) => {
                const cat =
                  CATEGORIES.find((item) => entry.note?.includes(`Category: ${item.value}`)) ||
                  CATEGORIES[5];

                return (
                  <div key={entry.id} className="recent-row">
                    <div className="recent-left">
                      <span>{cat.icon}</span>
                      <div>
                        <strong>{entry.source_name || cat.label}</strong>
                        <p>{entryDate(entry)}</p>
                      </div>
                    </div>
                    <strong className="amount">{money(entry.amount)}</strong>
                  </div>
                );
              })
            )}
          </div>
        </RoomCard>

        <p className="quote">“Diligence is the mother of good luck.” — Benjamin Franklin</p>
      </section>

      <style jsx global>{`
        .bank-page {
          min-height: 100vh;
          padding-top: 0;
          padding-bottom: 100px;
          background:
            radial-gradient(circle at top, rgba(245, 196, 88, 0.12), transparent 32rem),
            linear-gradient(180deg, #050302, #140a04 45%, #050302);
          color: #fff7ed;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .loading-room {
          display: grid;
          place-items: center;
          color: #c9a84c;
          font-size: 22px;
        }

        .desk-wrap {
          max-width: 1100px;
          margin: 0 auto;
          padding: 0 18px 18px;
          display: grid;
          gap: 18px;
        }

        .bank-hero {
          max-width: 1100px;
          margin: 0 auto;
          padding: 12px;
        }

        .bank-hero-frame {
          position: relative;
          border-radius: 28px;
          overflow: hidden;
          border: 1px solid rgba(201, 168, 76, 0.35);
          background: #050302;
          box-shadow: 0 28px 90px rgba(0, 0, 0, 0.65);
        }

        .bank-hero-img {
          display: block;
          width: 100%;
          height: auto;
          max-height: 430px;
          object-fit: cover;
          object-position: center top;
        }

        .bank-hero-shade {
          position: absolute;
          inset: 0;
          background:
            linear-gradient(180deg, rgba(5, 3, 2, 0.05), rgba(5, 3, 2, 0.22) 45%, rgba(5, 3, 2, 0.88)),
            linear-gradient(90deg, rgba(5, 3, 2, 0.58), transparent 50%, rgba(5, 3, 2, 0.38));
        }

        .bank-back-btn {
          position: absolute;
          top: 14px;
          left: 14px;
          z-index: 3;
          color: #f5e6c8;
          text-decoration: none;
          border: 1px solid rgba(201, 168, 76, 0.42);
          background: rgba(0, 0, 0, 0.64);
          border-radius: 999px;
          padding: 10px 16px;
          font-weight: 800;
        }

        .bank-hero-title {
          position: absolute;
          left: 22px;
          right: 22px;
          bottom: 18px;
          z-index: 3;
          max-width: 680px;
        }

        .bank-eyebrow {
          margin: 0 0 8px;
          color: #facc15;
          letter-spacing: 0.32em;
          text-transform: uppercase;
          font-weight: 900;
          font-size: 13px;
        }

        .bank-hero-title h1 {
          margin: 0;
          font-size: clamp(42px, 8vw, 78px);
          line-height: 0.9;
          font-family: var(--font-cormorant), Georgia, serif;
        }

        .bank-hero-title p:not(.bank-eyebrow) {
          max-width: 620px;
          margin: 10px 0 0;
          color: #ead9bd;
          font-size: 18px;
        }

        .notice {
          border-radius: 20px;
          padding: 14px 16px;
          color: #facc15;
          background: rgba(15, 8, 4, 0.92);
          border: 1px solid rgba(201, 168, 76, 0.35);
          text-align: center;
        }

        .stats-grid,
        .drawer-buttons,
        .form-grid,
        .chart-grid,
        .plan-grid,
        .mini-grid {
          display: grid;
          gap: 14px;
        }

        .stats-grid,
        .drawer-buttons {
          grid-template-columns: repeat(4, minmax(0, 1fr));
        }

        .form-grid,
        .plan-grid,
        .mini-grid {
          grid-template-columns: repeat(2, minmax(0, 1fr));
        }

        .chart-grid {
          grid-template-columns: minmax(0, 1.1fr) minmax(280px, 0.9fr);
        }

        .income-room-card {
          border-radius: 28px;
          padding: 22px;
          background: linear-gradient(180deg, rgba(18, 10, 4, 0.94), rgba(5, 3, 2, 0.97));
          border: 1px solid rgba(201, 168, 76, 0.34);
          box-shadow: 0 24px 80px rgba(0, 0, 0, 0.55);
        }

        .income-room-card h2 {
          margin: 0;
          color: #f5e6c8;
          font-size: 30px;
          line-height: 1;
        }

        .card-sub {
          color: #b99b60;
          margin: 8px 0 18px;
        }

        .income-drawer-button {
          min-height: 76px;
          border-radius: 26px;
          border: 1px solid rgba(201, 168, 76, 0.36);
          background: rgba(0, 0, 0, 0.68);
          color: #f5e6c8;
          font-size: 23px;
          font-weight: 900;
        }

        .income-drawer-button.active {
          background: rgba(22, 101, 52, 0.95);
          border-color: rgba(74, 222, 128, 0.7);
        }

        .income-drawer-button.danger {
          color: #fecaca;
          border-color: rgba(248, 113, 113, 0.55);
        }

        label span {
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

        .gap-box,
        .covered-box {
          margin-top: 16px;
          border-radius: 24px;
          padding: 20px;
          background: rgba(0, 0, 0, 0.48);
          border: 1px solid rgba(201, 168, 76, 0.25);
          text-align: center;
        }

        .gap-eyebrow {
          margin: 0;
          color: #d6c09a;
          font-size: 11px;
          letter-spacing: 0.18em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .gap-money {
          margin: 8px 0 0;
          font-size: 44px;
          font-weight: 900;
        }

        .gap-money.good {
          color: #4ade80;
        }

        .gap-money.danger {
          color: #f87171;
        }

        .gap-note,
        .covered-box p {
          margin-top: 10px;
          color: #e8d5b7;
        }

        .hourly-grid {
          display: grid;
          grid-template-columns: repeat(5, minmax(0, 1fr));
          gap: 12px;
        }

        .mini-hourly {
          margin-top: 16px;
        }

        .hour-card {
          border-radius: 20px;
          padding: 16px;
          background: rgba(0, 0, 0, 0.55);
          border: 1px solid rgba(201, 168, 76, 0.25);
          text-align: center;
        }

        .hour-card p {
          margin: 0;
          color: #d6c09a;
          font-size: 11px;
          letter-spacing: 0.12em;
          text-transform: uppercase;
          font-weight: 900;
        }

        .hour-card strong {
          display: block;
          margin-top: 8px;
          color: #c9a84c;
          font-size: 24px;
        }

        .hour-card.good strong {
          color: #4ade80;
        }

        .hour-card.warn strong {
          color: #facc15;
        }

        .hour-card.danger strong {
          color: #f87171;
        }

        .big-money {
          color: #4ade80;
          font-size: 46px;
          font-weight: 900;
          margin: 10px 0 0;
        }

        .chart-box {
          height: 190px;
          margin-top: 18px;
        }

        .recent-list,
        .source-list {
          display: grid;
          gap: 10px;
          margin-top: 14px;
        }

        .recent-row,
        .source-row {
          display: flex;
          justify-content: space-between;
          align-items: center;
          gap: 12px;
          border-radius: 18px;
          padding: 14px;
          background: rgba(255, 255, 255, 0.04);
          border: 1px solid rgba(201, 168, 76, 0.18);
        }

        .source-row button {
          border-radius: 12px;
          border: 1px solid rgba(248, 113, 113, 0.45);
          background: rgba(127, 29, 29, 0.35);
          color: #fecaca;
          padding: 9px 12px;
          font-weight: 900;
        }

        .recent-left {
          display: flex;
          align-items: center;
          gap: 10px;
        }

        .recent-left span {
          font-size: 24px;
        }

        .recent-left p,
        .source-row p {
          margin: 3px 0 0;
          color: #9a7d5a;
          font-size: 13px;
        }

        .recent-row .amount {
          color: #4ade80;
          font-size: 22px;
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
          .drawer-buttons,
          .chart-grid,
          .hourly-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
        }

        @media (max-width: 640px) {
          .stats-grid,
          .drawer-buttons,
          .form-grid,
          .chart-grid,
          .mini-grid,
          .plan-grid,
          .hourly-grid {
            grid-template-columns: 1fr;
          }

          .recent-row,
          .source-row {
            flex-direction: column;
            align-items: flex-start;
          }

          .recent-row .amount {
            align-self: flex-end;
          }
        }
      `}</style>
    </main>
  );
}
  
