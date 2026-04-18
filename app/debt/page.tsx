"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { incomeNeedsEngine } from "@/lib/engines/incomeNeedsEngine";

type SpendRow = {
  id: string;
  user_id: string;
  amount: number;
  category: string | null;
  merchant: string | null;
  date_iso: string;
  note: string | null;
  created_at: string;
};

type IncomeRow = {
  id: string;
  user_id: string;
  amount: number;
  source: string | null;
  date_iso: string;
  note: string | null;
  created_at: string;
};

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  kind: string | null;
  category: string | null;
  target: number | null;
  saved: number | null;
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

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: string | null;
  balance: number | null;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_day: number | null;
  due_date: string | null;
  is_monthly: boolean | null;
  note: string | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  bill_id: string | null;
  debt_id: string | null;
  amount: number;
  date_iso: string;
  merchant: string | null;
  note: string | null;
  created_at: string;
};

function getBillMonthlyAmount(bill: BillRow): number {
  if (bill.target != null) return Number(bill.target);
  if (bill.monthly_target != null) return Number(bill.monthly_target);
  if (bill.min_payment != null) return Number(bill.min_payment);
  return 0;
}

function getDebtMonthlyMin(debt: DebtRow): number {
  if (debt.monthly_min_payment != null)
    return Number(debt.monthly_min_payment);
  if (debt.min_payment != null) return Number(debt.min_payment);
  return 0;
}

function getDueLabel(billOrDebt: { due_day: number | null; due_date: string | null }) {
  if (billOrDebt.due_day != null) return `Due day ${billOrDebt.due_day}`;
  if (billOrDebt.due_date != null) return `Due ${billOrDebt.due_date}`;
  return "Due date not set";
}

export default function DashboardPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [income, setIncome] = useState<IncomeRow[]>([]);
  const [spend, setSpend] = useState<SpendRow[]>([]);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data?.user;
      if (!user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      const uid = user.id;
      setUserId(uid);

      const [
        incomeRes,
        spendRes,
        billsRes,
        debtsRes,
        paymentsRes,
      ] = await Promise.all([
        supabase.from("income_entries").select("*").eq("user_id", uid),
        supabase.from("spend_entries").select("*").eq("user_id", uid),
        supabase.from("bills").select("*").eq("user_id", uid),
        supabase.from("debts").select("*").eq("user_id", uid),
        supabase.from("payments").select("*").eq("user_id", uid),
      ]);

      if (incomeRes.error) setMessage(incomeRes.error.message);
      if (spendRes.error) setMessage(spendRes.error.message);
      if (billsRes.error) setMessage(billsRes.error.message);
      if (debtsRes.error) setMessage(debtsRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);

      setIncome(incomeRes.data || []);
      setSpend(spendRes.data || []);
      setBills(billsRes.data || []);
      setDebts(debtsRes.data || []);
      setPayments(paymentsRes.data || []);

      setLoading(false);
    }

    init();
  }, [supabase]);

  const totalIncome = useMemo(
    () => income.reduce((s, e) => s + Number(e.amount || 0), 0),
    [income]
  );

  const totalSpend = useMemo(
    () => spend.reduce((s, e) => s + Number(e.amount || 0), 0),
    [spend]
  );

  const totalMonthlyBills = useMemo(
    () => bills.reduce((s, b) => s + getBillMonthlyAmount(b), 0),
    [bills]
  );

  const totalDebtMinimums = useMemo(
    () => debts.reduce((s, d) => s + getDebtMonthlyMin(d), 0),
    [debts]
  );

  const cashflow = useMemo(
    () => totalIncome - totalSpend - totalMonthlyBills - totalDebtMinimums,
    [totalIncome, totalSpend, totalMonthlyBills, totalDebtMinimums]
  );

  const needs = useMemo(() => {
    return incomeNeedsEngine({
      totalMonthlyBills: totalMonthlyBills + totalDebtMinimums,
      incomeEntries: income,
      todayISO: new Date().toISOString().slice(0, 10),
    });
  }, [income, totalMonthlyBills, totalDebtMinimums]);

  const upcoming = useMemo(() => {
    const billItems = bills.map((b) => ({
      id: b.id,
      name: b.name,
      amount: getBillMonthlyAmount(b),
      due_day: b.due_day,
      due_date: b.due_date,
      type: "bill" as const,
    }));

    const debtItems = debts.map((d) => ({
      id: d.id,
      name: d.name,
      amount: getDebtMonthlyMin(d),
      due_day: d.due_day,
      due_date: d.due_date,
      type: "debt" as const,
    }));

    return [...billItems, ...debtItems].sort((a, b) => {
      const ad = a.due_day ?? 999;
      const bd = b.due_day ?? 999;
      return ad - bd;
    });
  }, [bills, debts]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-white/60">Loading dashboard…</p>
        </section>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-6xl px-6 py-10 space-y-10">
        <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight sm:text-4xl">
              Dashboard
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Your financial command center — powered by Smart Mode and Ben.
            </p>
          </div>

          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 max-w-xs">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
              Ben says
            </div>
            <p className="mt-1">{needs.benMessage}</p>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Income" value={totalIncome} />
          <Stat label="Total Spend" value={totalSpend} />
          <Stat label="Monthly Bills" value={totalMonthlyBills} />
          <Stat label="Debt Minimums" value={totalDebtMinimums} />
        </div>

        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Today's Need" value={needs.dailyNeed} />
          <Stat label="Weekly Need" value={needs.weeklyNeed} />
          <Stat label="Remaining Need" value={needs.remainingNeed} />
          <Stat label="Monthly Need" value={needs.monthlyNeed} />
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <div className="text-xs uppercase tracking-[0.2em] text-white/50">
            Monthly Progress
          </div>

          <div className="mt-2 h-3 w-full rounded-full bg-white/10 overflow-hidden">
            <div
              className="h-full bg-cyan-400"
              style={{
                width: `${Math.min(
                  (totalIncome /
                    (totalMonthlyBills + totalDebtMinimums)) *
                    100,
                  100
                )}%`,
              }}
            />
          </div>

          <div className="mt-2 text-xs text-white/60">
            {needs.shortfall > 0
              ? `Shortfall: $${needs.shortfall.toFixed(0)}`
              : `Surplus: $${needs.surplus.toFixed(0)}`}
          </div>
        </div>

        <div>
          <h2 className="text-lg font-bold mb-3">Upcoming obligations</h2>
          <div className="space-y-3">
            {upcoming.map((item) => (
              <div
                key={item.id}
                className="rounded-2xl border border-white/10 bg-white/5 p-4"
              >
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-sm font-semibold">{item.name}</div>
                    <div className="text-xs text-white/60">
                      {getDueLabel(item)}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold">
                      ${item.amount.toFixed(2)}
                    </div>
                    <div className="text-xs text-white/60">
                      {item.type === "bill" ? "Bill" : "Debt minimum"}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold mb-3">Cashflow snapshot</h2>
          <div className="text-2xl font-bold">
            ${cashflow.toFixed(2)}
          </div>
          <p className="text-sm text-white/60 mt-1">
            Income minus spend, bills, and debt minimums.
          </p>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">${value.toFixed(2)}</div>
    </div>
  );
}
