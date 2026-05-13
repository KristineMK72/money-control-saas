"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  target: number;
  category: string | null;
  due_date: string | null;
  due_day: number | null;
  created_at: string;
};

type PaymentRow = {
  id: string;
  amount: number;
  bill_id: string | null;
  date_iso: string;
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

const cardClass =
  "rounded-2xl border border-white/50 bg-white/94 p-5 shadow-xl";

const inputClass =
  "mt-2 w-full rounded-xl border border-zinc-300 bg-white px-3 py-2 text-zinc-950 outline-none focus:border-emerald-500";

export default function BillsPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [bills, setBills] = useState<BillRow[]>([]);
  const [payments, setPayments] = useState<PaymentRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [payingId, setPayingId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [message, setMessage] = useState("");

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");

  useEffect(() => {
    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function init() {
    setLoading(true);
    setMessage("");

    const { data, error } = await supabase.auth.getSession();

    if (error) {
      setMessage(error.message);
      setLoading(false);
      return;
    }

    const user = data.session?.user;

    if (!user) {
      setMessage("Please log in.");
      setLoading(false);
      return;
    }

    setUserId(user.id);

    await Promise.all([loadBills(user.id), loadPayments(user.id)]);

    setLoading(false);
  }

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select("id, user_id, name, target, category, due_date, due_day, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((data as BillRow[]) || []);
  }

  async function loadPayments(uid: string) {
    const { data, error } = await supabase
      .from("payments")
      .select("id, amount, bill_id, date_iso")
      .eq("user_id", uid);

    if (error) {
      setMessage(error.message);
      return;
    }

    setPayments((data as PaymentRow[]) || []);
  }

  async function addBill() {
    if (!userId) return;

    const amt = Number(amount);

    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Invalid bill. Add a name and amount above $0.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name: name.trim(),
      target: amt,
      category,
      due_date: dueDate || null,
      due_day: null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setAmount("");
    setDueDate("");
    setCategory("other");

    await loadBills(userId);

    setSaving(false);
    setMessage("Bill added.");
  }

  async function payBill(bill: BillRow) {
    if (!userId) {
      setMessage("Not logged in.");
      return;
    }

    const amt = Number(payAmount);

    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      date_iso: new Date().toISOString().slice(0, 10),
      amount: amt,
      merchant: bill.name,
      note: "Bill payment",
      bill_id: bill.id,
      debt_id: null,
    });

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Paid ${bill.name}.`);
    setPayingId(null);
    setPayAmount("");

    await Promise.all([loadPayments(userId), loadBills(userId)]);
  }

  async function deleteBill(id: string) {
    if (!userId) return;

    const confirmed = window.confirm("Delete this bill?");
    if (!confirmed) return;

    const { error } = await supabase
      .from("bills")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((prev) => prev.filter((b) => b.id !== id));
    setMessage("Bill deleted.");
  }

  const totalBills = useMemo(
    () => bills.reduce((sum, bill) => sum + Number(bill.target || 0), 0),
    [bills]
  );

  function getMonthlyPaid(billId: string) {
    const month = new Date().toISOString().slice(0, 7);

    return payments
      .filter((payment) => {
        return (
          payment.bill_id === billId &&
          Boolean(payment.date_iso) &&
          payment.date_iso.startsWith(month)
        );
      })
      .reduce((sum, payment) => sum + Number(payment.amount || 0), 0);
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-transparent p-6">
        <div className={`${cardClass} mx-auto max-w-4xl text-zinc-700`}>
          Loading bills...
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-transparent p-6">
      <div className="mx-auto max-w-4xl space-y-6">
        <header className={cardClass}>
          <div className="text-xs font-bold uppercase tracking-[0.2em] text-emerald-700">
            AskBen Bills
          </div>

          <h1 className="mt-2 text-3xl font-black text-zinc-950">Bills</h1>

          <p className="mt-2 text-sm text-zinc-700">
            Track bill targets, due dates, and payments without losing sight of
            the bigger money picture.
          </p>

          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <div className="text-sm font-semibold text-emerald-800">
              Total Bills
            </div>
            <div className="mt-1 text-3xl font-black text-emerald-950">
              {money(totalBills)}
            </div>
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900">
              {message}
            </div>
          )}
        </header>

        <section className={cardClass}>
          <h2 className="text-xl font-black text-zinc-950">Add Bill</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <label className="text-sm font-semibold text-zinc-700">
              Name
              <input
                placeholder="Rent, Electric, Phone..."
                value={name}
                onChange={(e) => setName(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Amount
              <input
                inputMode="decimal"
                placeholder="125.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Due Date
              <input
                type="date"
                value={dueDate}
                onChange={(e) => setDueDate(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="text-sm font-semibold text-zinc-700">
              Category
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={inputClass}
              >
                <option value="housing">Housing</option>
                <option value="utilities">Utilities</option>
                <option value="transportation">Transportation</option>
                <option value="debt">Debt</option>
                <option value="food">Food</option>
                <option value="other">Other</option>
              </select>
            </label>
          </div>

          <button
            onClick={addBill}
            disabled={saving}
            className="mt-4 w-full rounded-xl bg-emerald-500 px-4 py-3 font-bold text-white shadow-lg transition hover:bg-emerald-600 disabled:opacity-60"
          >
            {saving ? "Saving..." : "Add Bill"}
          </button>
        </section>

        <section className="space-y-4">
          {bills.length === 0 ? (
            <div className={`${cardClass} text-zinc-700`}>
              No bills yet. Add your first bill above.
            </div>
          ) : (
            bills.map((bill) => {
              const paid = getMonthlyPaid(bill.id);
              const pct =
                Number(bill.target || 0) > 0
                  ? Math.min((paid / Number(bill.target)) * 100, 100)
                  : 0;

              return (
                <article key={bill.id} className={cardClass}>
                  <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
                    <div>
                      <h3 className="text-xl font-black text-zinc-950">
                        {bill.name}
                      </h3>

                      <div className="mt-1 text-sm text-zinc-600">
                        Target: {money(Number(bill.target || 0))}
                      </div>

                      {bill.due_date && (
                        <div className="mt-1 text-sm text-zinc-600">
                          Due: {bill.due_date}
                        </div>
                      )}

                      {bill.category && (
                        <div className="mt-2 inline-flex rounded-full bg-zinc-100 px-3 py-1 text-xs font-semibold text-zinc-700">
                          {bill.category}
                        </div>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      {payingId === bill.id ? (
                        <>
                          <input
                            inputMode="decimal"
                            placeholder="Amount"
                            value={payAmount}
                            onChange={(e) => setPayAmount(e.target.value)}
                            className="w-28 rounded-lg border border-zinc-300 bg-white px-2 py-2 text-sm text-zinc-950 outline-none focus:border-emerald-500"
                          />

                          <button
                            onClick={() => payBill(bill)}
                            className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-bold text-white"
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
                            setPayingId(bill.id);
                            setPayAmount("");
                          }}
                          className="rounded-lg bg-zinc-950 px-3 py-2 text-sm font-bold text-white"
                        >
                          Pay
                        </button>
                      )}

                      <button
                        onClick={() => deleteBill(bill.id)}
                        className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700"
                      >
                        Delete
                      </button>
                    </div>
                  </div>

                  <div className="mt-5">
                    <div className="mb-2 flex justify-between text-xs font-semibold text-zinc-600">
                      <span>
                        {money(paid)} / {money(Number(bill.target || 0))} paid
                        this month
                      </span>
                      <span>{pct.toFixed(0)}%</span>
                    </div>

                    <div className="h-3 overflow-hidden rounded-full bg-zinc-200">
                      <div
                        className="h-full rounded-full bg-emerald-500"
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
