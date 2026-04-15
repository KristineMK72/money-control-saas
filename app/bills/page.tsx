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
  is_monthly: boolean | null;
  due_day: number | null;
  created_at: string;
};

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

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /* ---------------- LOAD ---------------- */

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data } = await supabase.auth.getSession();
      const user = data.session?.user;

      if (!user) {
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: billsData } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      setBills(billsData || []);
      setLoading(false);
    }

    load();
  }, []);

  /* ---------------- ADD BILL ---------------- */

  async function addBill() {
    if (!userId) return;

    const amt = Number(amount);

    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter valid bill + amount");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name: name.trim(),
      target: amt,
      category,
      due_date: dueDate || null,
      is_monthly: Boolean(dueDate),
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

    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId)
      .order("created_at", { ascending: false });

    setBills(data || []);
    setSaving(false);
    setMessage("Bill added");
  }

  /* ---------------- DELETE ---------------- */

  async function deleteBill(id: string) {
    if (!userId) return;

    await supabase.from("bills").delete().eq("id", id).eq("user_id", userId);

    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  /* ---------------- PAY BILL (NEW CORE FEATURE) ---------------- */

  async function payBill(bill: BillRow) {
    if (!userId) return;

    try {
      const { error } = await supabase.from("payments").insert({
        user_id: userId,
        date_iso: new Date().toISOString().slice(0, 10),
        amount: bill.target,
        merchant: bill.name,
        note: "Paid from Bills page",
        bill_id: bill.id,
        debt_id: null,
      });

      if (error) throw error;

      setMessage(`Paid ${bill.name}`);
    } catch (err: any) {
      setMessage(err.message || "Payment failed");
    }
  }

  /* ---------------- TOTALS ---------------- */

  const totals = useMemo(() => {
    const total = bills.reduce((s, b) => s + Number(b.target || 0), 0);

    const dueSoon = bills.reduce((s, b) => {
      const due = b.due_date || getNextDueDate(b.due_day);
      if (!due) return s;

      const d = new Date(due);
      const now = new Date();
      const in7 = new Date();
      in7.setDate(now.getDate() + 7);

      return d <= in7 ? s + Number(b.target || 0) : s;
    }, 0);

    return { total, dueSoon };
  }, [bills]);

  /* ---------------- UI ---------------- */

  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="max-w-4xl mx-auto p-6">

      <h1 className="text-2xl font-bold">Bills</h1>

      {message && <div className="mt-2 text-sm">{message}</div>}

      {/* SUMMARY */}
      <div className="mt-6 grid grid-cols-2 gap-4">
        <Card label="Total Bills" value={totals.total} />
        <Card label="Due Soon" value={totals.dueSoon} />
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
                  ${b.target} · {b.category || "other"}
                  {due ? ` · due ${due}` : ""}
                </div>
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => payBill(b)}
                  className="text-xs bg-black text-white px-3 py-1 rounded"
                >
                  Pay
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

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="border rounded-xl p-4 bg-white">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">${value.toFixed(2)}</div>
    </div>
  );
}
