"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

/* ---------------- TYPES ---------------- */

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

/* ---------------- PAGE ---------------- */

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

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

  /* ---------------- INIT ---------------- */

  useEffect(() => {
    init();
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

  /* ---------------- LOADERS ---------------- */

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

  /* ---------------- ADD BILL ---------------- */

  async function addBill() {
    if (!userId) return;

    const amt = Number(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Invalid bill.");
      return;
    }

    setSaving(true);

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

  /* ---------------- PAY BILL ---------------- */

  async function payBill(bill: BillRow) {
    if (!userId) {
      setMessage("Not logged in.");
      return;
    }

    const amt = Number(payAmount);
    if (!amt || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    const payload = {
      user_id: userId,
      date_iso: new Date().toISOString().slice(0, 10),
      amount: amt,
      merchant: bill.name,
      note: "Bill payment",
      bill_id: bill.id,
      debt_id: null,
    };

    const { error } = await supabase.from("payments").insert(payload);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(`Paid ${bill.name}`);
    setPayingId(null);
    setPayAmount("");

    await loadPayments(userId);
    await loadBills(userId);
  }

  /* ---------------- DELETE BILL ---------------- */

  async function deleteBill(id: string) {
    if (!userId) return;

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
  }

  /* ---------------- TOTALS & PROGRESS ---------------- */

  const totalBills = useMemo(
    () => bills.reduce((s, b) => s + Number(b.target || 0), 0),
    [bills]
  );

  function getMonthlyPaid(billId: string) {
    const now = new Date();
    const month = now.toISOString().slice(0, 7); // "YYYY-MM"

    return payments
      .filter((p) => p.bill_id === billId && p.date_iso.startsWith(month))
      .reduce((sum, p) => sum + Number(p.amount || 0), 0);
  }

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="max-w-4xl mx-auto p-6">
      <h1 className="text-2xl font-bold">Bills</h1>

      {message && (
        <div className="mt-2 text-sm text-zinc-600">{message}</div>
      )}

      <div className="mt-4 text-xl font-bold">
        Total Bills: ${totalBills.toFixed(2)}
      </div>

      {/* ADD BILL */}
      <div className="mt-6 border rounded-xl p-4 bg-white">
        <h2 className="font-semibold">Add Bill</h2>

        <input
          placeholder="Name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          className="mt-2 w-full border p-2 rounded"
        />

        <input
          placeholder="Amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="mt-2 w-full border p-2 rounded"
        />

        <input
          type="date"
          value={dueDate}
          onChange={(e) => setDueDate(e.target.value)}
          className="mt-2 w-full border p-2 rounded"
        />

        <select
          value={category}
          onChange={(e) => setCategory(e.target.value)}
          className="mt-2 w-full border p-2 rounded"
        >
          <option value="housing">Housing</option>
          <option value="utilities">Utilities</option>
          <option value="transportation">Transportation</option>
          <option value="debt">Debt</option>
          <option value="food">Food</option>
          <option value="other">Other</option>
        </select>

        <button
          onClick={addBill}
          disabled={saving}
          className="mt-3 w-full bg-black text-white p-2 rounded"
        >
          {saving ? "Saving..." : "Add Bill"}
        </button>
      </div>

      {/* BILL LIST */}
      <div className="mt-6 space-y-4">
        {bills.map((b) => {
          const paid = getMonthlyPaid(b.id);
          const pct = b.target > 0 ? Math.min((paid / b.target) * 100, 100) : 0;

          return (
            <div key={b.id} className="border rounded-xl p-4 bg-white">
              <div className="flex justify-between items-center">
                <div>
                  <div className="font-semibold">{b.name}</div>
                  <div className="text-sm text-zinc-500">
                    Target: ${b.target.toFixed(2)}
                  </div>
                  {b.due_date && (
                    <div className="text-xs text-zinc-400">
                      Due: {b.due_date}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-2">
                  {payingId === b.id ? (
                    <>
                      <input
                        type="number"
                        placeholder="Amount"
                        value={payAmount}
                        onChange={(e) => setPayAmount(e.target.value)}
                        className="border p-1 rounded w-24 text-xs"
                      />
                      <button
                        onClick={() => payBill(b)}
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
                        setPayingId(b.id);
                        setPayAmount("");
                      }}
                      className="text-xs bg-black text-white px-3 py-1 rounded"
                    >
                      Pay
                    </button>
                  )}

                  <button
                    onClick={() => deleteBill(b.id)}
                    className="text-xs text-red-500"
                  >
                    Delete
                  </button>
                </div>
              </div>

              {/* PROGRESS BAR */}
              <div className="mt-3">
                <div className="text-xs text-zinc-500 mb-1">
                  {paid.toFixed(2)} / {b.target.toFixed(2)} paid this month
                </div>
                <div className="w-full h-3 bg-zinc-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-green-600"
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
