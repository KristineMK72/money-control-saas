"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

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
  const nextMonthDue = new Date(nextMonthYear, nextMonth, safeDayNextMonth, 12, 0, 0, 0);

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
  return `$${n.toFixed(2)}`;
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black text-zinc-950">{value}</div>
    </div>
  );
}

function ProgressBar({ current, goal }: { current: number; goal: number }) {
  const pct = goal <= 0 ? 100 : Math.min(100, Math.max(0, (current / goal) * 100));

  return (
    <div>
      <div className="mb-2 flex items-center justify-between text-sm">
        <span className="text-zinc-500">Goal progress</span>
        <span className="font-semibold text-zinc-950">{pct.toFixed(0)}%</span>
      </div>
      <div className="h-4 overflow-hidden rounded-full bg-zinc-200">
        <div
          className="h-full rounded-full bg-emerald-500 transition-all"
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}

export default function IncomePlanPage() {
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

  const [name, setName] = useState("");
  const [incomeType, setIncomeType] = useState<"hourly" | "item" | "project" | "fixed">("hourly");
  const [rate, setRate] = useState("");
  const [plannedQuantity, setPlannedQuantity] = useState("");
  const [note, setNote] = useState("");

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

      setUserId(session.user.id);

      const [incomeRes, spendRes, paymentsRes, billsRes, debtsRes, hustlesRes] =
        await Promise.all([
          supabase.from("income_entries").select("id, amount, date_iso"),
          supabase.from("spend_entries").select("id, amount, date_iso"),
          supabase.from("payments").select("id, amount, date_iso"),
          supabase.from("bills").select("id, target, due_date, is_monthly, monthly_target, due_day"),
          supabase.from("debts").select("id, min_payment, due_date, is_monthly, due_day, monthly_min_payment"),
          supabase.from("side_hustles").select("*").order("created_at", { ascending: false }),
        ]);

      if (!incomeRes.error) setIncomeEntries((incomeRes.data || []) as IncomeRow[]);
      if (!spendRes.error) setSpendEntries((spendRes.data || []) as SpendRow[]);
      if (!paymentsRes.error) setPaymentEntries((paymentsRes.data || []) as PaymentRow[]);
      if (!billsRes.error) setBills((billsRes.data || []) as BillRow[]);
      if (!debtsRes.error) setDebts((debtsRes.data || []) as DebtRow[]);
      if (!hustlesRes.error) setSideHustles((hustlesRes.data || []) as SideHustleRow[]);

      setLoading(false);
    }

    loadPage();
  }, []);

  async function refreshSideHustles() {
    const { data, error } = await supabase
      .from("side_hustles")
      .select("*")
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

    const parsedRate = Number(rate);
    const parsedQty = Number(plannedQuantity);

    if (!name.trim() || !Number.isFinite(parsedRate) || parsedRate < 0 || !Number.isFinite(parsedQty) || parsedQty < 0) {
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
    setMessage("Income option added.");

    await refreshSideHustles();
    setSaving(false);
  }

  async function handleDeleteSideHustle(id: string) {
    setMessage("");

    const { error } = await supabase.from("side_hustles").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setSideHustles((prev) => prev.filter((row) => row.id !== id));
  }

  const weekEnd = endOfWindow(6);

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

  const gapThisWeek = Math.max(
    0,
    billsThisWeekTotal + debtThisWeekTotal + totalSpending + totalPayments - totalIncome
  );

  const plannedIncome = useMemo(() => {
    return sideHustles.reduce(
      (sum, row) => sum + Number(row.rate || 0) * Number(row.planned_quantity || 0),
      0
    );
  }, [sideHustles]);

  const remainingGap = Math.max(0, gapThisWeek - plannedIncome);
  const overGoal = Math.max(0, plannedIncome - gapThisWeek);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Income strategy
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Close the Gap
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Add side hustle options and see whether your plan covers this week’s shortfall.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a href="/dashboard" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Dashboard
              </a>
              <a href="/forecast" className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10">
                Forecast
              </a>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Gap this week" value={formatUSD(gapThisWeek)} />
            <StatCard label="Planned income" value={formatUSD(plannedIncome)} />
            <StatCard label="Remaining gap" value={formatUSD(remainingGap)} />
            <StatCard label="Over goal" value={formatUSD(overGoal)} />
            <StatCard
              label="Status"
              value={remainingGap <= 0 && gapThisWeek > 0 ? "Covered" : gapThisWeek === 0 ? "No gap" : "Needs work"}
            />
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
              <h2 className="text-2xl font-black">Add income option</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Examples: DoorDash, tutoring, consulting, online sales, babysitting.
              </p>

              <div className="mt-5 grid gap-3">
                <input
                  placeholder="Name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <select
                  value={incomeType}
                  onChange={(e) => setIncomeType(e.target.value as any)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
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
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
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
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <input
                  placeholder="Note (optional)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <button
                  onClick={handleAddSideHustle}
                  disabled={saving || !userId}
                  className="rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add Income Option"}
                </button>
              </div>
            </div>

            <div className="grid gap-6">
              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Progress</h2>
                <div className="mt-5">
                  <ProgressBar current={plannedIncome} goal={gapThisWeek} />
                </div>

                <div className="mt-6 grid gap-3">
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Gap this week</span>
                    <span className="font-bold">{formatUSD(gapThisWeek)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <span className="text-zinc-500">Planned income</span>
                    <span className="font-bold">{formatUSD(plannedIncome)}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl bg-emerald-50 p-4">
                    <span className="text-emerald-700">Remaining</span>
                    <span className="font-bold text-emerald-700">{formatUSD(remainingGap)}</span>
                  </div>
                </div>

                <div className="mt-6 rounded-2xl bg-zinc-50 p-4 text-sm leading-6 text-zinc-700">
                  {gapThisWeek === 0
                    ? "You currently have no weekly gap based on your entries."
                    : remainingGap === 0
                    ? "Your current side hustle plan covers the full gap."
                    : `Your plan does not fully cover the gap yet. You still need ${formatUSD(remainingGap)}.`}
                </div>
              </div>

              <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
                <h2 className="text-2xl font-black">Income plan</h2>
                <div className="mt-5 grid gap-3">
                  {loading ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      Loading income options...
                    </div>
                  ) : sideHustles.length === 0 ? (
                    <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                      No income options added yet.
                    </div>
                  ) : (
                    sideHustles.map((row) => {
                      const projected = Number(row.rate || 0) * Number(row.planned_quantity || 0);

                      return (
                        <div
                          key={row.id}
                          className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                        >
                          <div>
                            <div className="font-semibold">{row.name}</div>
                            <div className="text-sm text-zinc-500">
                              {formatUSD(Number(row.rate || 0))} × {Number(row.planned_quantity || 0)} · {row.income_type}
                              {row.note ? ` · ${row.note}` : ""}
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <div className="font-bold">{formatUSD(projected)}</div>
                            <button
                              onClick={() => handleDeleteSideHustle(row.id)}
                              className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                            >
                              Delete
                            </button>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="mt-6 text-sm text-zinc-400">Loading income plan...</div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
