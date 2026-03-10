"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "bill" | "credit" | "loan";
  category:
    | "housing"
    | "utilities"
    | "transportation"
    | "debt"
    | "food"
    | "other"
    | null;
  target: number;
  saved: number;
  due_date: string | null;
  due: string | null;
  priority: number | null;
  focus: boolean | null;
  balance: number | null;
  apr: number | null;
  min_payment: number | null;
  credit_limit: number | null;
  is_monthly: boolean | null;
  monthly_target: number | null;
  due_day: number | null;
  created_at: string;
};

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

type DebtRow = {
  id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  credit_limit: number | null;
  note: string | null;
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
  created_at: string;
};

type ForecastItem = {
  id: string;
  name: string;
  category?: string | null;
  due_date?: string | null;
  amount: number;
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

function endOfCurrentMonth() {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
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

  const startToday = startOfToday();

  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const safeDayThisMonth = Math.min(dueDay, lastDayThisMonth);
  const thisMonthDue = new Date(year, month, safeDayThisMonth, 12, 0, 0, 0);

  if (thisMonthDue >= startToday) {
    return thisMonthDue.toISOString().slice(0, 10);
  }

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const safeDayNextMonth = Math.min(dueDay, lastDayNextMonth);
  const nextMonthDue = new Date(nextMonthYear, nextMonth, safeDayNextMonth, 12, 0, 0, 0);

  return nextMonthDue.toISOString().slice(0, 10);
}

function effectiveDebtDueDate(debt: DebtRow) {
  if (debt.due_date) return debt.due_date;
  if (debt.is_monthly && debt.due_day) return getNextDueDateFromDay(debt.due_day);
  return null;
}

function effectiveDebtPaymentAmount(debt: DebtRow) {
  return Number(debt.monthly_min_payment || debt.min_payment || 0);
}

function formatUSD(n: number) {
  return `$${n.toFixed(2)}`;
}

function SectionCard({
  title,
  subtitle,
  total,
  items,
}: {
  title: string;
  subtitle: string;
  total: number;
  items: ForecastItem[];
}) {
  return (
    <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-bold">{title}</h2>
          <p className="mt-1 text-sm text-zinc-500">{subtitle}</p>
        </div>
        <div className="text-right">
          <div className="text-xs text-zinc-500">Total</div>
          <div className="text-lg font-black">{formatUSD(total)}</div>
        </div>
      </div>

      <div className="mt-4 grid gap-3">
        {items.length === 0 ? (
          <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
            Nothing here.
          </div>
        ) : (
          items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
            >
              <div>
                <div className="font-semibold">{item.name}</div>
                <div className="text-sm text-zinc-500">
                  {item.category || "other"}
                  {item.due_date ? ` · Due ${item.due_date}` : " · No due date"}
                </div>
              </div>
              <div className="font-semibold">{formatUSD(item.amount)}</div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default function ForecastPage() {
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeRow[]>([]);
  const [spendEntries, setSpendEntries] = useState<SpendRow[]>([]);
  const [paymentEntries, setPaymentEntries] = useState<PaymentRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);

  useEffect(() => {
    async function loadForecast() {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setMessage(sessionError.message);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setMessage("Please log in to view your forecast.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const [billsRes, incomeRes, spendRes, paymentsRes, debtsRes] =
        await Promise.all([
          supabase
            .from("bills")
            .select("*")
            .order("due_date", { ascending: true, nullsFirst: false }),
          supabase.from("income_entries").select("id, amount, date_iso"),
          supabase.from("spend_entries").select("id, amount, date_iso"),
          supabase.from("payments").select("id, amount, date_iso"),
          supabase.from("debts").select("*").order("created_at", { ascending: false }),
        ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      else setBills((billsRes.data || []) as BillRow[]);

      if (!incomeRes.error) setIncomeEntries((incomeRes.data || []) as IncomeRow[]);
      if (!spendRes.error) setSpendEntries((spendRes.data || []) as SpendRow[]);
      if (!paymentsRes.error) setPaymentEntries((paymentsRes.data || []) as PaymentRow[]);
      if (!debtsRes.error) setDebts((debtsRes.data || []) as DebtRow[]);

      setLoading(false);
    }

    loadForecast();
  }, []);

  const weekEnd = endOfWindow(6);
  const monthEnd = endOfCurrentMonth();

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

  const debtBalanceTotal = useMemo(
    () => debts.reduce((sum, row) => sum + Number(row.balance || 0), 0),
    [debts]
  );

  const debtMinimumsTotal = useMemo(
    () => debts.reduce((sum, row) => sum + effectiveDebtPaymentAmount(row), 0),
    [debts]
  );

  const {
    dueThisWeek,
    dueThisMonth,
    later,
    unscheduled,
    dueThisWeekTotal,
    dueThisMonthTotal,
    laterTotal,
    unscheduledTotal,
  } = useMemo(() => {
    const week: BillRow[] = [];
    const month: BillRow[] = [];
    const laterItems: BillRow[] = [];
    const unscheduledItems: BillRow[] = [];

    for (const bill of bills) {
      if (!bill.due_date) {
        unscheduledItems.push(bill);
        continue;
      }

      const due = parseDateSafe(bill.due_date);
      if (!due) {
        unscheduledItems.push(bill);
        continue;
      }

      if (due <= weekEnd) week.push(bill);
      else if (due <= monthEnd) month.push(bill);
      else laterItems.push(bill);
    }

    const sumTargets = (items: BillRow[]) =>
      items.reduce((sum, b) => sum + Number(b.target || 0), 0);

    return {
      dueThisWeek: week.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
      dueThisMonth: month.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
      later: laterItems.sort((a, b) => (a.due_date || "").localeCompare(b.due_date || "")),
      unscheduled: unscheduledItems,
      dueThisWeekTotal: sumTargets(week),
      dueThisMonthTotal: sumTargets(month),
      laterTotal: sumTargets(laterItems),
      unscheduledTotal: sumTargets(unscheduledItems),
    };
  }, [bills, weekEnd, monthEnd]);

  const {
    debtDueThisWeek,
    debtDueThisMonth,
    debtLater,
    debtUnscheduled,
    debtDueThisWeekTotal,
    debtDueThisMonthTotal,
    debtLaterTotal,
    debtUnscheduledTotal,
  } = useMemo(() => {
    const week: DebtRow[] = [];
    const month: DebtRow[] = [];
    const laterItems: DebtRow[] = [];
    const unscheduledItems: DebtRow[] = [];

    for (const debt of debts) {
      const dueDate = effectiveDebtDueDate(debt);
      if (!dueDate) {
        unscheduledItems.push(debt);
        continue;
      }

      const due = parseDateSafe(dueDate);
      if (!due) {
        unscheduledItems.push(debt);
        continue;
      }

      if (due <= weekEnd) week.push(debt);
      else if (due <= monthEnd) month.push(debt);
      else laterItems.push(debt);
    }

    const sumMinimums = (items: DebtRow[]) =>
      items.reduce((sum, d) => sum + effectiveDebtPaymentAmount(d), 0);

    return {
      debtDueThisWeek: week,
      debtDueThisMonth: month,
      debtLater: laterItems,
      debtUnscheduled: unscheduledItems,
      debtDueThisWeekTotal: sumMinimums(week),
      debtDueThisMonthTotal: sumMinimums(month),
      debtLaterTotal: sumMinimums(laterItems),
      debtUnscheduledTotal: sumMinimums(unscheduledItems),
    };
  }, [debts, weekEnd, monthEnd]);

  const availableAfterWeek = totalIncome - dueThisWeekTotal - debtDueThisWeekTotal;
  const availableAfterMonth =
    availableAfterWeek - dueThisMonthTotal - debtDueThisMonthTotal;
  const availableAfterSpending = availableAfterMonth - totalSpending;
  const netAfterPayments = availableAfterSpending - totalPayments;

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Forecast</h1>
            <p className="mt-2 text-zinc-600">
              See what is due this week and this month based on real cloud data.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Dashboard
            </a>

            <a
              href="/crisis"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Crisis Mode
            </a>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        {!userId && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">You are not logged in.</div>
            <p className="mt-2 text-sm text-zinc-600">
              Go to signup/login first, then come back here.
            </p>
            <div className="mt-4">
              <a
                href="/signup"
                className="inline-flex rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Go to Signup / Login
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-6">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(totalIncome)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Bills this week</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(dueThisWeekTotal)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt mins this week</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(debtDueThisWeekTotal)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Spending</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(totalSpending)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Payments</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(totalPayments)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt balance</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(debtBalanceTotal)}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After this week</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(availableAfterWeek)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After this month</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(availableAfterMonth)}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After spending</div>
            <div className="mt-2 text-3xl font-black">
              {formatUSD(availableAfterSpending)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">After payments</div>
            <div className="mt-2 text-3xl font-black">{formatUSD(netAfterPayments)}</div>
          </div>
        </div>

        <div className="mt-8 grid gap-6 xl:grid-cols-2">
          <SectionCard
            title="Bills due this week"
            subtitle="Bills due in the next 7 days, including overdue items."
            total={dueThisWeekTotal}
            items={dueThisWeek.map((b) => ({
              id: b.id,
              name: b.name,
              category: b.category,
              due_date: b.due_date,
              amount: Number(b.target || 0),
            }))}
          />

          <SectionCard
            title="Bills due later this month"
            subtitle="Bills due after this week but before month-end."
            total={dueThisMonthTotal}
            items={dueThisMonth.map((b) => ({
              id: b.id,
              name: b.name,
              category: b.category,
              due_date: b.due_date,
              amount: Number(b.target || 0),
            }))}
          />

          <SectionCard
            title="Debt minimums this week"
            subtitle="Minimum payments due in the next 7 days."
            total={debtDueThisWeekTotal}
            items={debtDueThisWeek.map((d) => ({
              id: d.id,
              name: d.name,
              category: d.kind,
              due_date: effectiveDebtDueDate(d),
              amount: effectiveDebtPaymentAmount(d),
            }))}
          />

          <SectionCard
            title="Debt minimums later this month"
            subtitle="Minimum payments due after this week but before month-end."
            total={debtDueThisMonthTotal}
            items={debtDueThisMonth.map((d) => ({
              id: d.id,
              name: d.name,
              category: d.kind,
              due_date: effectiveDebtDueDate(d),
              amount: effectiveDebtPaymentAmount(d),
            }))}
          />

          <SectionCard
            title="Later"
            subtitle="Bills and minimum payments due after this month."
            total={laterTotal + debtLaterTotal}
            items={[
              ...later.map((b) => ({
                id: `bill-${b.id}`,
                name: b.name,
                category: b.category,
                due_date: b.due_date,
                amount: Number(b.target || 0),
              })),
              ...debtLater.map((d) => ({
                id: `debt-${d.id}`,
                name: d.name,
                category: d.kind,
                due_date: effectiveDebtDueDate(d),
                amount: effectiveDebtPaymentAmount(d),
              })),
            ]}
          />

          <SectionCard
            title="No due date set"
            subtitle="These need due dates or due days so forecasting can prioritize them correctly."
            total={unscheduledTotal + debtUnscheduledTotal}
            items={[
              ...unscheduled.map((b) => ({
                id: `bill-unscheduled-${b.id}`,
                name: b.name,
                category: b.category,
                due_date: b.due_date,
                amount: Number(b.target || 0),
              })),
              ...debtUnscheduled.map((d) => ({
                id: `debt-unscheduled-${d.id}`,
                name: d.name,
                category: d.kind,
                due_date: effectiveDebtDueDate(d),
                amount: effectiveDebtPaymentAmount(d),
              })),
            ]}
          />
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">What this means</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Bills entered</div>
              <div className="mt-1 font-semibold">{bills.length}</div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Debt accounts entered</div>
              <div className="mt-1 font-semibold">{debts.length}</div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">This week outlook</div>
              <div className="mt-1 font-semibold">
                {availableAfterWeek >= 0
                  ? "You can currently cover this week's due items."
                  : "You are currently short for this week's due items."}
              </div>
            </div>

            <div className="rounded-2xl bg-zinc-50 p-4">
              <div className="text-sm text-zinc-500">Month outlook</div>
              <div className="mt-1 font-semibold">
                {netAfterPayments >= 0
                  ? "You still have positive room after current obligations."
                  : "You are projected short after current obligations."}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
