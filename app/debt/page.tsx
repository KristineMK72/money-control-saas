"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

const cardClass =
  "rounded-2xl border border-white/50 bg-white/94 p-5 text-zinc-950 shadow-xl";

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function monthPrefix() {
  return new Date().toISOString().slice(0, 7);
}

function money(value: number) {
  return value.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function DebtPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState("");

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!data.user) {
        setMessage("Please log in to view your debt.");
        setLoading(false);
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

    void init();
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

  async function payDebt(debt: DebtRow) {
    if (!userId) return;

    const amt = Number(payAmount);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      debt_id: debt.id,
      bill_id: null,
      amount: amt,
      date_iso: todayISO(),
      merchant: debt.name,
      note: "Debt payment",
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Payment added for ${debt.name}.`);
    setPayingId(null);
    setPayAmount("");

    await refresh();
  }

  async function deleteDebt(id: string) {
    if (!userId) return;

    const confirmed = window.confirm("Delete this debt?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDebts((prev) => prev.filter((debt) => debt.id !== id));
    setMessage("Debt deleted.");
  }

  const totals = useMemo(
    () =>
      debts.reduce(
        (acc, debt) => {
          acc.balance += Number(debt.balance || 0);
          acc.min += Number(debt.monthly_min_payment || debt.min_payment || 0);
          return acc;
        },
        { balance: 0, min: 0 }
      ),
    [debts]
  );

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className={`${cardClass} mx-auto max-w-5xl`}>
          Loading debt...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-6">
      <div className="mx-auto max-w-5xl space-y-6">
        <header className={cardClass}>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-blue-700">
            AskBen Debt
          </div>

          <h1 className="mt-2 text-3xl font-black text-zinc-950">Debt</h1>

          <p className="mt-2 text-sm text-zinc-700">
            Track balances, minimum payments, and payoff progress without
            losing the big picture.
          </p>

          {message && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {message}
            </div>
          )}
        </header>

        <section className="grid gap-4 md:grid-cols-3">
          <Card label="Total Debt" value={totals.balance} />
          <Card label="Monthly Minimums" value={totals.min} />
          <Card label="Accounts" value={debts.length} plain />
        </section>

        <section className="space-y-4">
          {debts.length === 0 ? (
            <div className={cardClass}>
              <div className="font-semibold text-zinc-950">
                No debts added yet.
              </div>
              <p className="mt-2 text-sm text-zinc-700">
                Add a loan or credit card so Ben can help you prioritize payoff.
              </p>
            </div>
          ) : (
            debts.map((debt) => {
              const debtPayments = payments.filter((p) => p.debt_id === debt.id);
              const lastPayment = debtPayments[0]?.date_iso || "—";

              const paidThisMonth = debtPayments
                .filter((p) => p.date_iso.startsWith(monthPrefix()))
                .reduce((sum, p) => sum + Number(p.amount || 0), 0);

              const minPay = Number(
                debt.monthly_min_payment || debt.min_payment || 0
              );

              const pct = minPay
                ? Math.min((paidThisMonth / minPay) * 100, 100)
                : 0;

              return (
                <article key={debt.id} className={cardClass}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h2 className="text-xl font-black text-zinc-950">
                        {debt.name}
                      </h2>

                      <div className="mt-1 text-sm text-zinc-600">
                        {money(Number(debt.balance || 0))} · {debt.kind}
                      </div>

                      {debt.due_date && (
                        <div className="mt-1 text-sm text-zinc-600">
                          Due: {debt.due_date}
                        </div>
                      )}

                      <div className="mt-1 text-sm text-zinc-600">
                        Last payment: {lastPayment}
                      </div>

                      {debt.apr !== null && debt.apr !== undefined && (
                        <div className="mt-2 inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-semibold text-blue-700">
                          APR: {Number(debt.apr).toFixed(2)}%
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {payingId === debt.id ? (
                        <>
                          <input
                            inputMode="decimal"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            placeholder="Amount"
                            className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-950 outline-none focus:border-blue-500"
                          />

                          <button
                            onClick={() => payDebt(debt)}
                            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-bold text-white"
                          >
                            Confirm
                          </button>

                          <button
                            onClick={() => {
                              setPayingId(null);
                              setPayAmount("");
                            }}
                            className="rounded-lg border border-zinc-300 bg-white px-3 py-2 text-sm font-bold text-zinc-700"
                          >
                            Cancel
                          </button>
                        </>
                      ) : (
                        <button
                          onClick={() => {
                            setPayingId(debt.id);
                            setPayAmount("");
                          }}
                          className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white"
                        >
                          Pay
                        </button>
                      )}

                      <button
                        onClick={() => deleteDebt(debt.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-600">
                      <span>
                        {money(paidThisMonth)} / {money(minPay)} paid this
                        month
                      </span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-blue-600"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                </article>
              );
            })
          )}
        </section>
      </div>
    </main>
  );
}

function Card({
  label,
  value,
  plain = false,
}: {
  label: string;
  value: number;
  plain?: boolean;
}) {
  return (
    <div className={cardClass}>
      <div className="text-sm text-zinc-600">{label}</div>
      <div className="mt-2 text-2xl font-black text-zinc-950">
        {plain ? value : money(value)}
      </div>
    </div>
  );
}
