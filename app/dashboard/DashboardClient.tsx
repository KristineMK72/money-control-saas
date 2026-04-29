"use client";

import { useMemo, useState } from "react";

/* ───────── TYPES ───────── */
type SpendEntry = {
  id: string;
  amount?: number | null;
  merchant?: string | null;
  created_at?: string | null;
};

type IncomeEntry = {
  id: string;
  amount?: number | null;
  created_at?: string | null;
  date_iso?: string | null;
  received_on?: string | null;
};

type Bill = {
  id: string;
  name: string;
  amount?: number | null;
  target?: number | null;
  monthly_target?: number | null;
  min_payment?: number | null;
  due_day?: number | null;
};

type Debt = {
  id: string;
  name: string;
  min_payment?: number | null;
  due_day?: number | null;
};

type Payment = {
  id: string;
  amount?: number | null;
  created_at?: string | null;
  note?: string | null;
};

type Props = {
  profile?: any;
  initialBills?: Bill[];
  initialDebts?: Debt[];
  initialSpend?: SpendEntry[];
  initialIncome?: IncomeEntry[];
  initialPayments?: Payment[];
  user?: any;
};

/* ───────── SAFE HELPERS ───────── */
const safeNumber = (n: any) => (typeof n === "number" && !isNaN(n) ? n : 0);

const safeDate = (value?: string | null) => {
  if (!value) return null;
  const d = new Date(value);
  return isNaN(d.getTime()) ? null : d;
};

const formatMoney = (value: any) =>
  `$${safeNumber(value).toLocaleString()}`;

const getMonthKey = (d: Date | null) =>
  d ? `${d.getFullYear()}-${d.getMonth() + 1}` : null;

const getBillAmount = (b: Bill) =>
  safeNumber(b.target || b.monthly_target || b.min_payment || b.amount);

/* ───────── COMPONENT ───────── */
export default function DashboardClient({
  profile,
  initialBills = [],
  initialDebts = [],
  initialSpend = [],
  initialIncome = [],
  initialPayments = [],
  user,
}: Props) {
  const [showModal, setShowModal] = useState(false);

  const displayName =
    profile?.display_name ||
    user?.email?.split("@")[0] ||
    "there";

  const thisMonth = getMonthKey(new Date());

  /* ───────── MONTHLY TOTALS ───────── */
  const monthlySpend = useMemo(() => {
    return (initialSpend ?? []).reduce((sum, s) => {
      const date = safeDate(s.created_at);
      const key = getMonthKey(date);
      return key === thisMonth ? sum + safeNumber(s.amount) : sum;
    }, 0);
  }, [initialSpend, thisMonth]);

  const monthlyIncome = useMemo(() => {
    return (initialIncome ?? []).reduce((sum, i) => {
      const date = safeDate(i.date_iso || i.received_on || i.created_at);
      const key = getMonthKey(date);
      return key === thisMonth ? sum + safeNumber(i.amount) : sum;
    }, 0);
  }, [initialIncome, thisMonth]);

  const net = monthlyIncome - monthlySpend;

  /* ───────── UPCOMING ───────── */
  const upcoming = useMemo(() => {
    const today = new Date();

    const build = (name: string, amount: number, due?: number | null) => {
      if (!due) return null;

      const d = new Date();
      d.setDate(due);

      if (d < today) d.setMonth(d.getMonth() + 1);

      const diff = (d.getTime() - today.getTime()) / 86400000;
      if (diff < 0 || diff > 7) return null;

      return {
        name,
        amount: safeNumber(amount),
        date: d,
      };
    };

    const bills = (initialBills ?? [])
      .map((b) => build(b.name, getBillAmount(b), b.due_day));

    const debts = (initialDebts ?? [])
      .map((d) => build(d.name, d.min_payment, d.due_day));

    return [...bills, ...debts]
      .filter((x): x is { name: string; amount: number; date: Date } => !!x)
      .sort((a, b) => a.date.getTime() - b.date.getTime());
  }, [initialBills, initialDebts]);

  /* ───────── RECENT ───────── */
  const recent = useMemo(() => {
    return [...(initialSpend ?? []), ...(initialPayments ?? [])]
      .filter((x) => x?.created_at)
      .sort((a, b) => {
        const aTime = new Date(a.created_at ?? 0).getTime();
        const bTime = new Date(b.created_at ?? 0).getTime();
        return bTime - aTime;
      })
      .slice(0, 5);
  }, [initialSpend, initialPayments]);

  /* ───────── UI ───────── */
  return (
    <main className="min-h-screen bg-zinc-950 text-white p-4">
      <div className="max-w-5xl mx-auto space-y-6">

        <h1 className="text-2xl font-semibold">
          Welcome back, {displayName}
        </h1>

        {/* SUMMARY */}
        <div className="grid md:grid-cols-3 gap-4">
          <Card label="Income" value={monthlyIncome} good />
          <Card label="Spend" value={monthlySpend} />
          <Card label="Net" value={net} good={net >= 0} />
        </div>

        {/* UPCOMING */}
        <div className="bg-zinc-900 p-4 rounded-xl">
          <div className="flex justify-between mb-2">
            <h2>Upcoming</h2>
            <button onClick={() => setShowModal(true)}>View</button>
          </div>

          {upcoming.length === 0 ? (
            <p className="text-zinc-500 text-sm">Nothing due</p>
          ) : (
            upcoming.map((u, i) => (
              <div key={i} className="flex justify-between py-1">
                <span>{u.name}</span>
                <span>{formatMoney(u.amount)}</span>
              </div>
            ))
          )}
        </div>

        {/* RECENT */}
        <div className="bg-zinc-900 p-4 rounded-xl">
          <h2 className="mb-2">Recent Activity</h2>

          {recent.length === 0 ? (
            <p className="text-zinc-500 text-sm">No activity</p>
          ) : (
            recent.map((r: any) => (
              <div key={r.id} className="flex justify-between py-1">
                <span>{r.merchant || r.note || "Activity"}</span>
                <span>{formatMoney(r.amount)}</span>
              </div>
            ))
          )}
        </div>
      </div>

      {/* MODAL */}
      {showModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center">
          <div className="bg-zinc-900 p-4 rounded-xl w-80">
            <button onClick={() => setShowModal(false)}>Close</button>

            {upcoming.map((u, i) => (
              <div key={i}>
                {u.name} — {formatMoney(u.amount)}
              </div>
            ))}
          </div>
        </div>
      )}
    </main>
  );
}

/* ───────── CARD ───────── */
function Card({
  label,
  value,
  good,
}: {
  label: string;
  value: number;
  good?: boolean;
}) {
  return (
    <div className="bg-zinc-900 p-4 rounded-xl">
      <p className="text-xs text-zinc-400">{label}</p>
      <p className={good ? "text-emerald-400" : "text-red-400"}>
        {formatMoney(value)}
      </p>
    </div>
  );
}
