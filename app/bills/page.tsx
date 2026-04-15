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

type PaymentInsert = {
  user_id: string;
  date_iso: string;
  amount: number;
  merchant: string;
  note: string | null;
  bill_id: string;
  debt_id: null;
};

/* ---------------- HELPERS ---------------- */

function getNextDueDate(dueDay?: number | null) {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;

  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();

  const lastDay = new Date(y, m + 1, 0).getDate();
  const safeDay = Math.min(dueDay, lastDay);

  const thisMonth = new Date(y, m, safeDay);
  if (thisMonth >= now) return thisMonth.toISOString().slice(0, 10);

  const nextMonth = new Date(y, m + 1, safeDay);
  return nextMonth.toISOString().slice(0, 10);
}

/* ---------------- PAGE ---------------- */

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [userId, setUserId] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [payingId, setPayingId] = useState<string | null>(null);
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

    await loadBills(user.id);

    setLoading(false);
  }

  /* ---------------- LOAD BILLS ---------------- */

  async function loadBills(uid: string) {
    const { data, error } = await supabase
      .from("bills")
      .select<BillRow>("id, user_id, name, target, category, due_date, due_day, created_at")
      .eq("user_id", uid)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills(data || []);
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

    setPayingId(bill.id);
    setMessage("");

    const payload: PaymentInsert = {
      user_id: userId,
      date_iso: new Date().toISOString().slice(0, 10),
      amount: bill.target,
      merchant: bill.name,
      note: "Paid from Bills page",
      bill_id: bill.id,
      debt_id: null,
    };

    try {
      const { error } = await supabase.from("payments").insert(payload);

      if (error) throw error;

      setMessage(`Paid ${bill.name}`);
    } catch (err: any) {
      setMessage(err.message || "Payment failed");
    } finally {
      setPayingId(null);
    }
  }

  /* ---------------- DELETE BILL ---------------- */

  async function deleteBill(id: string) {
    if (!userId) return;

    await supabase.from("bills").delete().eq("id", id).eq("user_id", userId);

    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  /* ---------------- TOTALS ---------------- */

  const totals = useMemo(() => {
    const total = bills.reduce((s, b) => s + Number(b.target || 0), 0);
    return { total };
  }, [bills]);

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="max-w-4xl mx-auto p-6">

      <h1 className="text-2xl font-bold">Bills</h1>

      {message && (
        <div className="mt-2 text-sm text-zinc-600">{message}</div>
      )}

      <div className="mt-4 text-xl font-bold">
        Total Bills: ${totals.total.toFixed(2)}
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

      {/* LIST */}
      <div className="mt-6 space-y-3">
        {bills.map((b) => {
          const due = b.due_date || getNextDueDate(b.due_day);

          return (
            <div
              key={b.id}
              className="border rounded-xl p-3 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold">{b.name}</div>
                <div className="text-sm text-zinc-500">
                  ${b.target}
                  {due ? ` · due ${due}` : ""}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => payBill(b)}
                  disabled={payingId === b.id}
                  className="text-xs bg-black text-white px-3 py-1 rounded"
                >
                  {payingId === b.id ? "Paying..." : "Pay"}
                </button>

                <button
                  onClick={() => deleteBill(b.id)}
                  className="text-xs text-red-500"
                >
                  Delete
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </main>
  );
}
