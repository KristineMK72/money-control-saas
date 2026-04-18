"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import {
  Chart as ChartJS,
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  TimeScale,
} from "chart.js";
import { Doughnut, Bar, Line } from "react-chartjs-2";
import "chartjs-adapter-date-fns";

ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  PointElement,
  LineElement,
  TimeScale
);

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

type BillKind = "credit" | "subscription" | "sinking" | "goal" | "fixed" | "unknown";

function getBillMonthlyAmount(bill: BillRow): number {
  if (bill.target != null) return Number(bill.target);
  if (bill.monthly_target != null) return Number(bill.monthly_target);
  if (bill.min_payment != null) return Number(bill.min_payment);
  return 0;
}

function classifyBill(bill: BillRow): BillKind {
  const hasCredit =
    bill.balance != null || bill.min_payment != null || bill.credit_limit != null;
  const hasSinking = bill.saved != null && bill.target != null;
  const hasGoal = bill.target != null && (bill.priority != null || bill.focus === true);

  if (hasCredit) return "credit";
  if (hasSinking) return "sinking";
  if (hasGoal) return "goal";
  if (bill.target != null || bill.monthly_target != null) return "subscription";
  if (bill.due_day != null || bill.due_date != null) return "fixed";
  return "unknown";
}

function getDueLabel(bill: BillRow): string {
  if (bill.due_day != null) return `Due day ${bill.due_day}`;
  if (bill.due_date != null) return `Due ${bill.due_date}`;
  return "Due date not set";
}

function getBillBadge(kind: BillKind): string {
  switch (kind) {
    case "credit":
      return "Credit";
    case "subscription":
      return "Subscription / Utility";
    case "sinking":
      return "Sinking fund";
    case "goal":
      return "Goal";
    case "fixed":
      return "Fixed bill";
    default:
      return "Other";
  }
}

function getPressureLabel(pressure: number): string {
  if (!isFinite(pressure) || pressure <= 0) return "No bill pressure yet.";
  if (pressure < 0.3) return "Low bill pressure — you’ve got room to breathe.";
  if (pressure < 0.6) return "Manageable bill pressure — stay mindful, but you’re okay.";
  if (pressure < 1) return "High bill pressure — bills are eating a big chunk of income.";
  return "Very high bill pressure — this month is tight. Ben can help you triage.";
}

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/signup?mode=login";
        return;
      }

      const uid = data.user.id;
      setUserId(uid);

      const [billsRes, paymentsRes] = await Promise.all([
        supabase.from("bills").select("*").eq("user_id", uid),
        supabase.from("payments").select("*").eq("user_id", uid),
      ]);

      if (billsRes.error) setMessage(billsRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);

      setBills((billsRes.data || []) as BillRow[]);
      setPayments((paymentsRes.data || []) as PaymentRow[]);
      setLoading(false);
    }

    init();
  }, [supabase]);

  const {
    totalMonthlyBills,
    byCategory,
    byKind,
    paymentsByDate,
    billsWithPayments,
    billPressure,
  } = useMemo(() => {
    const byCategoryMap = new Map<string, number>();
    const byKindMap = new Map<BillKind, number>();
    const paymentsByDateMap = new Map<string, number>();
    const billsWithPaymentsMap = new Map<string, number>();

    let total = 0;

    for (const bill of bills) {
      const amount = getBillMonthlyAmount(bill);
      total += amount;

      const category = bill.category || "Uncategorized";
      byCategoryMap.set(category, (byCategoryMap.get(category) || 0) + amount);

      const kind = classifyBill(bill);
      byKindMap.set(kind, (byKindMap.get(kind) || 0) + amount);
    }

    for (const p of payments) {
      if (p.bill_id) {
        billsWithPaymentsMap.set(
          p.bill_id,
          (billsWithPaymentsMap.get(p.bill_id) || 0) + Number(p.amount)
        );
      }
      if (p.date_iso) {
        const key = p.date_iso;
        paymentsByDateMap.set(
          key,
          (paymentsByDateMap.get(key) || 0) + Number(p.amount)
        );
      }
    }

    const totalMonthlyBills = total;
    const totalIncome = 1; // TODO: wire real income if you want pressure vs income
    const billPressure = totalMonthlyBills / totalIncome;

    return {
      totalMonthlyBills,
      byCategory: Array.from(byCategoryMap.entries()),
      byKind: Array.from(byKindMap.entries()),
      paymentsByDate: Array.from(paymentsByDateMap.entries()).sort(
        (a, b) => new Date(a[0]).getTime() - new Date(b[0]).getTime()
      ),
      billsWithPayments: billsWithPaymentsMap,
      billPressure,
    };
  }, [bills, payments]);

  const doughnutData = useMemo(() => {
    if (!bills.length) {
      return {
        labels: ["No bills"],
        datasets: [
          {
            data: [1],
            backgroundColor: ["rgba(148, 163, 184, 0.6)"],
            borderWidth: 0,
          },
        ],
      };
    }

    const labels = bills.map((b) => b.name);
    const data = bills.map((b) => getBillMonthlyAmount(b));
    const colors = bills.map((_, i) => {
      const palette = [
        "rgba(34, 211, 238, 0.8)",
        "rgba(56, 189, 248, 0.8)",
        "rgba(129, 140, 248, 0.8)",
        "rgba(244, 114, 182, 0.8)",
        "rgba(251, 191, 36, 0.8)",
        "rgba(52, 211, 153, 0.8)",
      ];
      return palette[i % palette.length];
    });

    return {
      labels,
      datasets: [
        {
          data,
          backgroundColor: colors,
          borderWidth: 0,
        },
      ],
    };
  }, [bills]);

  const categoryBarData = useMemo(() => {
    if (!byCategory.length) {
      return {
        labels: ["No categories"],
        datasets: [
          {
            label: "Bills",
            data: [0],
            backgroundColor: "rgba(34, 211, 238, 0.8)",
          },
        ],
      };
    }

    return {
      labels: byCategory.map(([cat]) => cat),
      datasets: [
        {
          label: "Monthly amount",
          data: byCategory.map(([, amt]) => amt),
          backgroundColor: "rgba(34, 211, 238, 0.8)",
        },
      ],
    };
  }, [byCategory]);

  const paymentsLineData = useMemo(() => {
    if (!paymentsByDate.length) {
      return {
        labels: [],
        datasets: [
          {
            label: "Payments",
            data: [],
            borderColor: "rgba(34, 211, 238, 0.8)",
            backgroundColor: "rgba(34, 211, 238, 0.2)",
          },
        ],
      };
    }

    return {
      labels: paymentsByDate.map(([date]) => date),
      datasets: [
        {
          label: "Bill payments over time",
          data: paymentsByDate.map(([, amt]) => amt),
          borderColor: "rgba(34, 211, 238, 0.8)",
          backgroundColor: "rgba(34, 211, 238, 0.2)",
          tension: 0.3,
        },
      ],
    };
  }, [paymentsByDate]);

  const dueTimeline = useMemo(() => {
    const withDue = bills
      .map((b) => ({
        bill: b,
        dueDay: b.due_day ?? null,
      }))
      .sort((a, b) => {
        if (a.dueDay == null && b.dueDay == null) return 0;
        if (a.dueDay == null) return 1;
        if (b.dueDay == null) return -1;
        return a.dueDay - b.dueDay;
      });

    return withDue;
  }, [bills]);

  if (loading) {
    return (
      <main className="min-h-screen bg-zinc-950 text-white">
        <section className="mx-auto max-w-6xl px-6 py-10">
          <p className="text-sm text-white/60">Loading bills…</p>
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
              Bills overview
            </h1>
            <p className="mt-2 text-sm text-white/60">
              Smart view of your monthly obligations, payments, and bill pressure.
            </p>
          </div>
          <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 max-w-xs">
            <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
              Ben says
            </div>
            <p className="mt-1">
              {bills.length === 0
                ? "Add a few bills and I’ll show you where the pressure really is."
                : getPressureLabel(billPressure)}
            </p>
          </div>
        </header>

        {message && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Total monthly bills
            </div>
            <div className="mt-2 text-2xl font-bold">
              ${totalMonthlyBills.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Bill types
            </div>
            <div className="mt-2 text-sm text-white/70">
              {byKind.length === 0
                ? "No bills yet"
                : byKind
                    .map(([kind, amt]) => `${getBillBadge(kind)}: $${amt.toFixed(0)}`)
                    .join(" · ")}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Bills with payments
            </div>
            <div className="mt-2 text-2xl font-bold">
              {bills.filter((b) => billsWithPayments.has(b.id)).length}
            </div>
          </div>

          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="text-xs uppercase tracking-[0.2em] text-white/50">
              Bill pressure
            </div>
            <div className="mt-2 text-2xl font-bold">
              {isFinite(billPressure) ? `${(billPressure * 100).toFixed(0)}%` : "—"}
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Bill amount distribution</h2>
              <span className="text-xs text-white/50">
                By bill, using Smart Mode amounts
              </span>
            </div>
            <div className="mt-4">
              <Doughnut
                data={doughnutData}
                options={{
                  plugins: {
                    legend: {
                      labels: {
                        color: "#e5e7eb",
                      },
                    },
                  },
                }}
              />
            </div>
          </div>

          <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-lg font-bold">Bills by category</h2>
              <span className="text-xs text-white/50">
                Monthly amount per category
              </span>
            </div>
            <div className="mt-4">
              <Bar
                data={categoryBarData}
                options={{
                  responsive: true,
                  plugins: {
                    legend: {
                      labels: { color: "#e5e7eb" },
                    },
                  },
                  scales: {
                    x: {
                      ticks: { color: "#9ca3af" },
                      grid: { color: "rgba(148, 163, 184, 0.2)" },
                    },
                    y: {
                      ticks: { color: "#9ca3af" },
                      grid: { color: "rgba(148, 163, 184, 0.2)" },
                    },
                  },
                }}
              />
            </div>
          </div>
        </div>

        
