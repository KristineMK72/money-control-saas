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

/* -------------------- Types -------------------- */

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_day: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  user_id: string;
  amount: number;
  debt_id: string | null;
  bill_id: string | null;
  date_iso: string;
  merchant: string | null;
  note: string | null;
  created_at: string;
};

/* -------------------- Helpers -------------------- */

const todayISO = () => new Date().toISOString().slice(0, 10);
const monthPrefix = () => new Date().toISOString().slice(0, 7);
const fmt = (n: number | null | undefined) =>
  typeof n === "number" && !isNaN(n) ? n.toFixed(2) : "0.00";

/* -------------------- Page -------------------- */

export default function DebtPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  /* -------------------- Load -------------------- */

  useEffect(() => {
    async function init() {
      const { data } = await supabase.auth.getUser();
      if (!data.user) {
        window.location.href = "/signup?mode=login";
        return;
      }

      const uid = data.user.id;
      setUserId(uid);

      const [debtsRes, paymentsRes] = await Promise.all([
        supabase.from("debts").select("*").eq("user_id", uid),
        supabase.from("payments").select("*").eq("user_id", uid),
      ]);

      if (debtsRes.error) setMessage(debtsRes.error.message);
      if (paymentsRes.error) setMessage(paymentsRes.error.message);

      setDebts((debtsRes.data || []) as DebtRow[]);
      setPayments((paymentsRes.data || []) as PaymentRow[]);
      setLoading(false);
    }

    init();
  }, [supabase]);

  async function refresh() {
    if (!userId) return;

    const [debtsRes, paymentsRes] = await Promise.all([
      supabase.from("debts").select("*").eq("user_id", userId),
      supabase.from("payments").select("*").eq("user_id", userId),
    ]);

    setDebts((debtsRes.data || []) as DebtRow[]);
    setPayments((paymentsRes.data || []) as PaymentRow[]);
  }

  /* -------------------- Pay -------------------- */

  async function payDebt(debt: DebtRow) {
    if (!userId) return;

    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const payload = {
      user_id: userId,
      debt_id: debt.id,
      bill_id: null,
      amount: amt,
      date_iso: todayISO(),
      merchant: debt.name,
      note: "Debt payment",
    };

    const { error } = await supabase.from("payments").insert(payload);
    if (error) {
      setMessage(error.message);
      return;
    }

    setPayingId(null);
    setPayAmount("");
    await refresh();
  }

  /* -------------------- Delete -------------------- */

  async function deleteDebt(id: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDebts((prev) => prev.filter((d) => d.id !== id));
  }

  /* -------------------- Stats -------------------- */

  const totals = useMemo(
    () =>
      debts.reduce(
        (acc, d) => {
          acc.balance += d.balance || 0;
          acc.min += d.monthly_min_payment || d.min_payment || 0;
          return acc;
        },
        { balance: 0, min: 0 }
      ),
    [debts]
  );

  const sortedDebts = useMemo(
    () =>
      [...debts].sort((a, b) => {
        const aDay = a.due_day ?? 32;
        const bDay = b.due_day ?? 32;
        return aDay - bDay;
      }),
    [debts]
  );

  /* -------------------- Charts -------------------- */

  // Doughnut: balance distribution
  const doughnutData = useMemo(
    () => ({
      labels: debts.map((d) => d.name),
      datasets: [
        {
          data: debts.map((d) => d.balance),
          backgroundColor: [
            "#4ade80",
            "#60a5fa",
            "#f472b6",
            "#facc15",
            "#fb923c",
            "#a78bfa",
            "#34d399",
            "#f97316",
            "#22c55e",
            "#3b82f6",
          ],
        },
      ],
    }),
    [debts]
  );

  // Bar: minimum payments
  const barData = useMemo(
    () => ({
      labels: debts.map((d) => d.name),
      datasets: [
        {
          label: "Minimum Payment",
          data: debts.map((d) => d.monthly_min_payment || d.min_payment || 0),
          backgroundColor: "#60a5fa",
        },
      ],
    }),
    [debts]
  );

  // Line: payments over time (by date_iso)
  const paymentsOverTime = useMemo(() => {
    const byDate: Record<string, number> = {};
    payments.forEach((p) => {
      if (!p.debt_id) return;
      byDate[p.date_iso] = (byDate[p.date_iso] || 0) + Number(p.amount || 0);
    });

    const dates = Object.keys(byDate).sort();
    return {
      labels: dates,
      datasets: [
        {
          label: "Debt Payments",
          data: dates.map((d) => byDate[d]),
          borderColor: "#22c55e",
          backgroundColor: "rgba(34,197,94,0.2)",
          tension: 0.2,
        },
      ],
    };
  }, [payments]);

  /* -------------------- UI -------------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="min-h-screen bg-zinc-50 p-6 space-y-8">
      <header className="flex flex-col gap-2 md:flex-row md:items-baseline md:justify-between">
        <div>
          <h1 className="text-3xl font-black">Debt</h1>
          <p className="text-sm text-zinc-500">
            Snapshot of your balances, minimums, and payment momentum.
          </p>
        </div>
      </header>

      {message && (
        <div className="mt-3 text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
          {message}
        </div>
      )}

      {/* Summary */}
      <section className="grid gap-4 md:grid-cols-3">
        <Card label="Total Debt" value={totals.balance} />
        <Card label="Monthly Minimums" value={totals.min} />
      </section>

      {/* Analytics */}
      <section className="grid gap-8 md:grid-cols-2">
        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-2">Debt distribution</h2>
          {debts.length ? (
            <Doughnut data={doughnutData} />
          ) : (
            <p className="text-xs text-zinc-400">No debts to visualize yet.</p>
          )}
        </div>

        <div className="bg-white p-4 rounded-xl shadow-sm">
          <h2 className="font-semibold mb-2">Minimum payments by account</h2>
          {debts.length ? (
            <Bar
              data={barData}
              options={{
                plugins: { legend: { display: false } },
                scales: {
                  x: { ticks: { font: { size: 10 } } },
                  y: { beginAtZero: true },
                },
              }}
            />
          ) : (
            <p className="text-xs text-zinc-400">No minimums to show yet.</p>
          )}
        </div>
      </section>

      <section className="bg-white p-4 rounded-xl shadow-sm">
        <h2 className="font-semibold mb-2">Payments over time</h2>
        {paymentsOverTime.labels.length ? (
          <Line
            data={paymentsOverTime}
            options={{
              plugins: { legend: { display: false } },
              scales: {
                x: {
                  ticks: { font: { size: 10 } },
                },
                y: {
                  beginAtZero: true,
                },
              },
            }}
          />
        ) : (
          <p className="text-xs text-zinc-400">
            No debt payments recorded yet.
          </p>
        )}
      </section>

      {/* List */}
      <section className="space-y-4">
        {sortedDebts.map((d) => {
          const debtPayments = payments.filter((p) => p.debt_id === d.id);

          const lastPayment = debtPayments[0]?.date_iso || "—";

          const paidThisMonth = debtPayments
            .filter((p) => p.date_iso.startsWith(monthPrefix()))
            .reduce((sum, p) => sum + Number(p.amount), 0);

          const minPay = d.monthly_min_payment || d.min_payment || 0;
          const pct = minPay ? Math.min((paidThisMonth / minPay) * 100, 100) : 0;

          return (
            <div key={d.id} className="rounded-xl bg-white p-4 shadow-sm">
              <div className="flex justify-between gap-4">
                <div>
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-sm text-zinc-500">
                    ${fmt(d.balance)} · {d.kind}
                  </div>

                  <div className="text-xs text-zinc-400">
                    Due day: {d.due_day ?? "Not set"}
                  </div>

                  <div className="text-xs text-zinc-400">
                    Last payment: {lastPayment}
                  </div>
                </div>

                <div className="flex gap-2 items-start">
                  {payingId === d.id ? (
                    <>
                      <input
                        type="number"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="border p-1 rounded w-24 text-xs"
                      />
                      <button
                        onClick={() => payDebt(d)}
                        className="text-xs bg-green-600 text-white px-3 py-1 rounded"
                      >
                        Confirm
                      </button>
                      <button
                        onClick={() => {
                          setPayingId(null);
                          setPayAmount("");
                        }}
                        className="text-xs text-red-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <button
                      onClick={() => {
                        setPayingId(d.id);
                        setPayAmount("");
                      }}
                      className="text-xs bg-black text-white px-3 py-1 rounded"
                    >
                      Pay
                    </button>
                  )}

                  <button
                    onClick={() => deleteDebt(d.id)}
                    className="text-xs text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* Progress Bar */}
              <div className="mt-3">
                <div className="text-xs text-zinc-500 mb-1">
                  {fmt(paidThisMonth)} / {fmt(minPay)} paid this month
                </div>
                <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-blue-600"
                    style={{ width: `${pct}%` }}
                  />
                </div>
              </div>
            </div>
          );
        })}

        {sortedDebts.length === 0 && (
          <p className="text-xs text-zinc-500">
            No debts added yet. Once you add some, this page will light up.
          </p>
        )}
      </section>
    </main>
  );
}

/* -------------------- Card -------------------- */

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">${fmt(value)}</div>
    </div>
  );
}
