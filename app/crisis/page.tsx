"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import BenBubble from "@/components/BenBubble";
import { BenEngine } from "@/lib/ben/engine";
import { clampMoney, money } from "@/lib/money/math";
import { currentMonthStartISO } from "@/lib/money/dates";
import {
  prioritizeMoneyItems,
  type PriorityInput,
} from "@/lib/money/priorityV2";

type BillRow = {
  id: string;
  name: string | null;
  target?: number | string | null;
  monthly_target?: number | string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  due_date?: string | null;
  due?: string | null;
  due_day?: number | string | null;
  category?: string | null;
  kind?: string | null;
  focus?: boolean | null;
};

type DebtRow = {
  id: string;
  name: string | null;
  balance?: number | string | null;
  min_payment?: number | string | null;
  monthly_min_payment?: number | string | null;
  due_date?: string | null;
  due_day?: number | string | null;
  apr?: number | string | null;
  kind?: string | null;
};

type IncomeEntryRow = {
  id: string;
  amount: number | string | null;
  date_iso: string | null;
};

type PaymentRow = {
  id: string;
  amount: number | string | null;
  bill_id: string | null;
  debt_id: string | null;
  date_iso: string | null;
  created_at?: string | null;
};

const shellClass =
  "rounded-2xl border border-white/40 bg-slate-950/70 p-6 shadow-2xl backdrop-blur-xl md:p-8";

const cardClass =
  "rounded-2xl border border-white/80 bg-white/95 p-6 text-zinc-950 shadow-2xl shadow-zinc-950/10 backdrop-blur-xl transition hover:bg-white";

function billAmount(bill: BillRow) {
  return clampMoney(
    bill.monthly_target ?? bill.target ?? bill.balance ?? bill.min_payment
  );
}

function debtMinimum(debt: DebtRow) {
  return clampMoney(debt.monthly_min_payment ?? debt.min_payment);
}

function dueLabel(days: number | null) {
  if (days === null) return "No due date";
  if (days < 0) return `Overdue by ${Math.abs(days)} day(s)`;
  if (days === 0) return "Due today";
  if (days === 1) return "Due tomorrow";
  return `Due in ${days} days`;
}

export default function CrisisPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [incomeEntries, setIncomeEntries] = useState<IncomeEntryRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    void loadCrisisData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function loadCrisisData() {
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
      setMessage("Please log in to access Crisis Mode.");
      setLoading(false);
      return;
    }

    const uid = session.user.id;

    const [billsRes, debtsRes, incomeRes, paymentsRes] = await Promise.all([
      supabase.from("bills").select("*").eq("user_id", uid),
      supabase.from("debts").select("*").eq("user_id", uid),
      supabase.from("income_entries").select("*").eq("user_id", uid),
      supabase
        .from("payments")
        .select("id, amount, bill_id, debt_id, date_iso, created_at")
        .eq("user_id", uid),
    ]);

    if (billsRes.error) setMessage(billsRes.error.message);
    if (debtsRes.error) setMessage(debtsRes.error.message);
    if (incomeRes.error) setMessage(incomeRes.error.message);
    if (paymentsRes.error) setMessage(paymentsRes.error.message);

    setBills((billsRes.data || []) as BillRow[]);
    setDebts((debtsRes.data || []) as DebtRow[]);
    setIncomeEntries((incomeRes.data || []) as IncomeEntryRow[]);
    setPayments((paymentsRes.data || []) as PaymentRow[]);
    setLoading(false);
  }

  const paidThisMonth = useMemo(() => {
    const monthStart = currentMonthStartISO();

    const byBill: Record<string, number> = {};
    const byDebt: Record<string, number> = {};

    payments.forEach((payment) => {
      const date = (payment.date_iso || payment.created_at || "").slice(0, 10);
      if (!date || date < monthStart) return;

      const amount = clampMoney(payment.amount);

      if (payment.bill_id) {
        byBill[payment.bill_id] = (byBill[payment.bill_id] || 0) + amount;
      }

      if (payment.debt_id) {
        byDebt[payment.debt_id] = (byDebt[payment.debt_id] || 0) + amount;
      }
    });

    return { byBill, byDebt };
  }, [payments]);

  const priorityItems = useMemo<PriorityInput[]>(() => {
    return [
      ...bills.map((bill) => {
        const due = billAmount(bill);
        const paid = paidThisMonth.byBill[bill.id] || 0;
        const remaining = Math.max(0, due - paid);

        return {
          id: bill.id,
          type: "bill" as const,
          name: bill.name,
          amount: remaining,
          due_date: bill.due_date,
          due: bill.due,
          due_day: bill.due_day,
          category: bill.category,
          kind: bill.kind,
          focus: bill.focus,
          is_paid_this_month: paid >= due && due > 0,
        };
      }),

      ...debts.map((debt) => {
        const due = debtMinimum(debt);
        const paid = paidThisMonth.byDebt[debt.id] || 0;
        const remaining = Math.max(0, due - paid);

        return {
          id: debt.id,
          type: "debt" as const,
          name: debt.name,
          amount: remaining,
          balance: debt.balance,
          due_date: debt.due_date,
          due_day: debt.due_day,
          kind: debt.kind,
          apr: debt.apr,
          is_paid_this_month: paid >= due && due > 0,
        };
      }),
    ];
  }, [bills, debts, paidThisMonth]);

  const rankedItems = useMemo(() => {
    return prioritizeMoneyItems(priorityItems).filter(
      (row) => !row.item.is_paid_this_month && row.amount > 0
    );
  }, [priorityItems]);

  const top3 = rankedItems.slice(0, 3);
  const criticalNext7Total = rankedItems
    .filter((row) => row.daysUntilDue !== null && row.daysUntilDue <= 7)
    .reduce((sum, row) => sum + row.amount, 0);

  const totalUnpaidObligations = rankedItems.reduce(
    (sum, row) => sum + row.amount,
    0
  );

  const incomeThisMonth = useMemo(() => {
    const monthStart = currentMonthStartISO();

    return incomeEntries
      .filter((entry) => (entry.date_iso || "").slice(0, 10) >= monthStart)
      .reduce((sum, entry) => sum + clampMoney(entry.amount), 0);
  }, [incomeEntries]);

  const crisisGap = Math.max(0, criticalNext7Total - incomeThisMonth);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Crisis Mode",
    totalNeeded: criticalNext7Total,
    incomeSoFar: incomeThisMonth,
    incomeGap: crisisGap,
    dailyIncomeNeeded: Math.ceil(crisisGap / 7),
  });

  if (loading) {
    return <div className="p-8 text-center">Loading crisis triage...</div>;
  }

  return (
<<<<<<< HEAD
    <main className="min-h-screen bg-zinc-950/82 -md text-white">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                72-hour triage
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Crisis Mode
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Calm triage for what matters most right now, powered by your real data.
              </p>
            </div>
=======
    <main className="min-h-screen bg-transparent p-4 md:p-6">
      <div className={`${shellClass} mx-auto max-w-6xl space-y-10`}>
        <header>
          <h1 className="text-5xl font-black text-white">Crisis Mode</h1>
          <p className="mt-2 text-lg font-semibold text-white/90">
            72-hour triage — focus only on unpaid obligations that matter most.
          </p>
        </header>
>>>>>>> ed0e3caecb0f44437c318e467ad26eae9d5ac2c6

        {message ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm font-bold text-amber-950">
            {message}
          </div>
        ) : null}

        <div className="rounded-2xl border border-white/20 bg-slate-950/80 p-6 shadow-xl backdrop-blur-xl">
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </div>

        <div className="grid gap-4 md:grid-cols-3">
          <StatCard
            label="Critical Next 7 Days"
            value={money(criticalNext7Total)}
          />
          <StatCard label="Top Priority Items" value={top3.length.toString()} />
          <StatCard
            label="Total Unpaid Obligations"
            value={money(totalUnpaidObligations)}
          />
        </div>

        <div className={cardClass}>
          <h2 className="mb-6 text-2xl font-black">
            Top 3 Actions Right Now
          </h2>

          <div className="space-y-4">
            {top3.length > 0 ? (
              top3.map((row, i) => (
                <div
                  key={`${row.item.type}-${row.item.id}`}
                  onClick={() =>
                    setExpandedId(
                      expandedId === `${row.item.type}-${row.item.id}`
                        ? null
                        : `${row.item.type}-${row.item.id}`
                    )
                  }
                  className="cursor-pointer rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm transition hover:bg-white"
                >
                  <div className="flex items-center gap-4">
                    <div className="text-3xl font-black text-emerald-600">
                      #{i + 1}
                    </div>

                    <div className="flex-1">
                      <div className="font-black">
                        {row.item.name ?? "Unnamed"}
                      </div>
                      <div className="text-sm font-semibold text-zinc-600">
                        {dueLabel(row.daysUntilDue)}
                      </div>
                    </div>

                    <div className="text-right text-xl font-black">
                      {money(row.amount)}
                    </div>
                  </div>

                  {expandedId === `${row.item.type}-${row.item.id}` && (
                    <div className="mt-4 border-t border-zinc-200 pt-4 text-sm font-semibold text-zinc-700">
                      <p>Type: {row.item.type}</p>
                      <p>Score: {row.score}</p>
                      <p>Reasons: {row.reasons.join(", ")}</p>
                    </div>
                  )}
                </div>
              ))
            ) : (
              <p className="text-zinc-600">
                No unpaid crisis items found. That is a blessed calm.
              </p>
            )}
          </div>
        </div>

        <div className={cardClass}>
          <h2 className="mb-6 text-2xl font-black">
            Everything Ranked by Urgency
          </h2>

          <div className="space-y-3">
            {rankedItems.length === 0 ? (
              <p className="text-zinc-600">No unpaid items found.</p>
            ) : (
              rankedItems.map((row, i) => (
                <div
                  key={`${row.item.type}-${row.item.id}`}
                  className="flex cursor-pointer items-center justify-between rounded-2xl border border-zinc-200 bg-white/90 p-5 shadow-sm transition hover:bg-white"
                >
                  <div className="flex items-center gap-4">
                    <span className="font-mono text-sm text-zinc-500">
                      #{i + 1}
                    </span>
                    <div>
                      <div className="font-black">
                        {row.item.name ?? "Unnamed"}
                      </div>
                      <div className="text-xs font-bold uppercase tracking-widest text-zinc-500">
                        {row.item.type} • {dueLabel(row.daysUntilDue)}
                      </div>
                    </div>
                  </div>

                  <div className="text-right text-xl font-black">
                    {money(row.amount)}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className={cardClass}>
      <div className="text-xs font-black uppercase tracking-widest text-zinc-600">
        {label}
      </div>
      <div className="mt-3 text-4xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
