"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* -------------------- Types -------------------- */

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  monthly_min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  credit_limit: number | null;
  note: string | null;
  is_monthly: boolean | null;
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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthPrefix() {
  return new Date().toISOString().slice(0, 7); // "YYYY-MM"
}

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
      const { data, error } = await supabase.auth.getUser();
      if (error || !data.user) {
        window.location.href = "/signup?mode=login";
        return;
      }

      const uid = data.user.id;
      setUserId(uid);

      const [debtsRes, paymentsRes] = await Promise.all([
        supabase
          .from("debts")
          .select("*")
          .eq("user_id", uid)
          .order("created_at", { ascending: false }),

        supabase
          .from("payments")
          .select("*")
          .eq("user_id", uid)
          .order("date_iso", { ascending: false }),
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
      supabase
        .from("debts")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false }),

      supabase
        .from("payments")
        .select("*")
        .eq("user_id", userId)
        .order("date_iso", { ascending: false }),
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

  /* -------------------- UI -------------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="min-h-screen bg-zinc-50 p-6">
      <h1 className="text-3xl font-black">Debt</h1>

      {message && (
        <div className="mt-3 text-sm text-zinc-600">{message}</div>
      )}

      {/* Summary */}
      <div className="mt-6 grid gap-4 md:grid-cols-3">
        <Card label="Total Debt" value={totals.balance} />
        <Card label="Monthly Minimums" value={totals.min} />
      </div>

      {/* List */}
      <div className="mt-8 space-y-4">
        {debts.map((d) => {
          const debtPayments = payments.filter((p) => p.debt_id === d.id);

          const lastPayment = debtPayments[0]?.date_iso || "—";

          const paidThisMonth = debtPayments
            .filter((p) => p.date_iso.startsWith(monthPrefix()))
            .reduce((sum, p) => sum + Number(p.amount), 0);

          const minPay = d.monthly_min_payment || d.min_payment || 0;
          const pct = minPay ? Math.min((paidThisMonth / minPay) * 100, 100) : 0;

          return (
            <div key={d.id} className="rounded-xl bg-white p-4">
              <div className="flex justify-between">
                <div>
                  <div className="font-semibold">{d.name}</div>
                  <div className="text-sm text-zinc-500">
                    ${d.balance.toFixed(2)} · {d.kind}
                  </div>

                  {d.due_date && (
                    <div className="text-xs text-zinc-400">
                      Due: {d.due_date}
                    </div>
                  )}

                  <div className="text-xs text-zinc-400">
                    Last payment: {lastPayment}
                  </div>
                </div>

                <div className="flex gap-2">
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
                  {paidThisMonth.toFixed(2)} / {minPay.toFixed(2)} paid this month
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
      </div>
    </main>
  );
}

/* -------------------- Card -------------------- */

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">${value.toFixed(2)}</div>
    </div>
  );
}
