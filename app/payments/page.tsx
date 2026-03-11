"use client";


import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type PaymentRow = {
  id: string;
  user_id: string;
  date_iso: string;
  amount: number;
  merchant: string | null;
  note: string | null;
  created_at: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function PaymentsPage() {
  const supabase = createSupabaseBrowserClient();
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [payments, setPayments] = useState<PaymentRow[]>([]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/signup");
    router.refresh();
  }

  useEffect(() => {
    async function init() {
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
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data: rows, error: paymentsError } = await supabase
        .from("payments")
        .select("*")
        .order("date_iso", { ascending: false });

      if (paymentsError) {
        setMessage(paymentsError.message);
      } else {
        setPayments((rows || []) as PaymentRow[]);
      }

      setLoading(false);
    }

    init();
  }, []);

  async function refreshPayments() {
    const { data, error } = await supabase
      .from("payments")
      .select("*")
      .order("date_iso", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((data || []) as PaymentRow[]);
  }

  async function handleAddPayment() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Please enter what you paid and a valid amount.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      date_iso: dateISO,
      amount: amt,
      merchant: merchant.trim(),
      note: note.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setDateISO(todayISO());
    setMerchant("");
    setAmount("");
    setNote("");
    setMessage("Payment added.");

    await refreshPayments();
    setSaving(false);
  }

  async function handleDeletePayment(id: string) {
    setMessage("");

    const { error } = await supabase.from("payments").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((prev) => prev.filter((p) => p.id !== id));
  }

  const totalPayments = useMemo(() => {
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  const thisMonthPayments = useMemo(() => {
    const monthKey = todayISO().slice(0, 7);
    return payments
      .filter((p) => (p.date_iso || "").slice(0, 7) === monthKey)
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }, [payments]);

  return (
    <main className="min-h-screen bg-black text-white">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="rounded-[32px] border border-white/10 bg-gradient-to-br from-[#07131a] via-black to-[#0b2217] p-6 md:p-8 shadow-2xl">
          <div className="flex flex-col gap-3">
            <div>
              <div className="inline-flex rounded-full border border-emerald-400/20 bg-emerald-400/10 px-4 py-2 text-xs font-semibold uppercase tracking-[0.2em] text-emerald-300">
                Money out
              </div>
              <h1 className="mt-4 text-4xl font-black tracking-tight text-white">
                Payments
              </h1>
              <p className="mt-3 max-w-2xl text-lg text-zinc-300">
                Log payments you made toward bills, credit cards, or loans.
              </p>
            </div>

            <div className="flex flex-wrap gap-3">
              <a
                href="/dashboard"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Dashboard
              </a>
              <a
                href="/bills"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Bills
              </a>
              <a
                href="/income"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Income
              </a>
              <a
                href="/spend"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Spending
              </a>
              <a
                href="/debt"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Credit & Loans
              </a>
              <a
                href="/payments"
                className="rounded-xl bg-white px-4 py-3 text-sm font-semibold text-black hover:bg-zinc-100"
              >
                Payments
              </a>
              <a
                href="/forecast"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Forecast
              </a>
              <a
                href="/crisis"
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Crisis Mode
              </a>
              <button
                onClick={handleLogout}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-3 text-sm font-semibold text-white hover:bg-white/10"
              >
                Logout
              </button>
            </div>
          </div>

          {message ? (
            <div className="mt-5 rounded-2xl border border-emerald-400/20 bg-emerald-400/10 p-4 text-sm text-emerald-200">
              {message}
            </div>
          ) : null}

          {!userId && !loading ? (
            <div className="mt-6 rounded-2xl border border-white/10 bg-white/5 p-6">
              <div className="font-semibold text-white">You are not logged in.</div>
              <p className="mt-2 text-sm text-zinc-300">
                Go to signup/login first, then come back here.
              </p>
              <div className="mt-4">
                <a
                  href="/signup"
                  className="inline-flex rounded-xl bg-emerald-400 px-4 py-3 text-sm font-semibold text-black hover:bg-emerald-300"
                >
                  Go to Signup / Login
                </a>
              </div>
            </div>
          ) : null}

          <div className="mt-8 grid gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">Total payments</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                ${totalPayments.toFixed(2)}
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-5 shadow-sm">
              <div className="text-sm text-zinc-500">This month</div>
              <div className="mt-2 text-3xl font-black text-zinc-950">
                ${thisMonthPayments.toFixed(2)}
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
              <h2 className="text-2xl font-black">Log a payment</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Example: Rent, Capital One, Car Loan, Electric.
              </p>

              <div className="mt-5 grid gap-3">
                <input
                  type="date"
                  value={dateISO}
                  onChange={(e) => setDateISO(e.target.value)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <input
                  placeholder="What did you pay?"
                  value={merchant}
                  onChange={(e) => setMerchant(e.target.value)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <input
                  placeholder="Amount"
                  type="number"
                  inputMode="decimal"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <input
                  placeholder="Note (bill payment, card payment, loan payment)"
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
                />

                <button
                  onClick={handleAddPayment}
                  disabled={saving || !userId}
                  className="rounded-xl bg-zinc-950 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60"
                >
                  {saving ? "Saving..." : "Add Payment"}
                </button>
              </div>
            </div>

            <div className="rounded-3xl border border-white/10 bg-white p-6 text-zinc-950 shadow-sm">
              <h2 className="text-2xl font-black">Payment history</h2>
              <p className="mt-1 text-sm text-zinc-500">
                Logged payments reduce remaining money in your forecast.
              </p>

              <div className="mt-5 grid gap-3">
                {loading ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                    Loading payments...
                  </div>
                ) : payments.length === 0 ? (
                  <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                    No payments logged yet.
                  </div>
                ) : (
                  payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                    >
                      <div>
                        <div className="font-semibold">
                          {payment.merchant || "Unnamed payment"}
                        </div>
                        <div className="text-sm text-zinc-500">
                          {payment.date_iso}
                          {payment.note ? ` · ${payment.note}` : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-3">
                        <div className="font-bold">
                          ${Number(payment.amount).toFixed(2)}
                        </div>
                        <button
                          onClick={() => handleDeletePayment(payment.id)}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
