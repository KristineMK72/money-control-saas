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

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();

  const [bills, setBills] = useState<BillRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);

  // form
  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState("other");
  const [dueDate, setDueDate] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // ---------------------------
  // LOAD USER + DATA
  // ---------------------------
  useEffect(() => {
    async function load() {
      setLoading(true);

      const {
        data: { session },
      } = await supabase.auth.getSession();

      if (!session?.user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data } = await supabase
        .from("bills")
        .select("*")
        .eq("user_id", session.user.id)
        .order("created_at", { ascending: false });

      setBills((data || []) as BillRow[]);
      setLoading(false);
    }

    load();
  }, []);

  // ---------------------------
  // ADD BILL
  // ---------------------------
  async function addBill() {
    if (!userId) return;

    const amt = Number(amount);
    if (!name || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter valid name and amount.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name,
      target: amt,
      category,
      due_date: dueDate || null,
      is_monthly: false,
      due_day: null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setAmount("");
    setCategory("other");
    setDueDate("");

    const { data } = await supabase
      .from("bills")
      .select("*")
      .eq("user_id", userId);

    setBills((data || []) as BillRow[]);

    setSaving(false);
    setMessage("Bill added.");
  }

  // ---------------------------
  // DELETE BILL
  // ---------------------------
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

  // ---------------------------
  // TOTALS (LIKE YOUR DASHBOARD PATTERN)
  // ---------------------------
  const totals = useMemo(() => {
    const total = bills.reduce((sum, b) => sum + Number(b.target || 0), 0);

    const dueSoon = bills.reduce((sum, b) => {
      if (!b.due_date) return sum;

      const due = new Date(b.due_date);
      const now = new Date();
      const in7 = new Date();
      in7.setDate(now.getDate() + 7);

      if (due <= in7) return sum + Number(b.target || 0);

      return sum;
    }, 0);

    return { total, dueSoon };
  }, [bills]);

  // ---------------------------
  // UI
  // ---------------------------
  if (loading) return <div className="p-6">Loading...</div>;

  return (
    <main className="p-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold">Bills</h1>

      {message ? (
        <div className="mt-3 text-sm text-zinc-600">{message}</div>
      ) : null}

      {/* SUMMARY (same pattern as dashboard cards) */}
      <div className="mt-6 grid gap-4 md:grid-cols-2">
        <Card label="Total Bills" value={totals.total} />
        <Card label="Due Soon (7 days)" value={totals.dueSoon} />
      </div>

      {/* ADD BILL */}
      <div className="mt-6 rounded-xl border bg-white p-4">
        <h2 className="font-semibold">Add Bill</h2>

        <div className="mt-3 grid gap-2">
          <input
            placeholder="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="border p-2 rounded"
          />

          <input
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="border p-2 rounded"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="border p-2 rounded"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="border p-2 rounded"
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
            className="bg-black text-white p-2 rounded"
          >
            {saving ? "Saving..." : "Add Bill"}
          </button>
        </div>
      </div>

      {/* LIST */}
      <div className="mt-6 space-y-3">
        {bills.map((b) => (
          <div
            key={b.id}
            className="border rounded p-3 flex justify-between"
          >
            <div>
              <div className="font-semibold">{b.name}</div>
              <div className="text-sm text-zinc-500">
                ${b.target} · {b.category || "other"}
                {b.due_date ? ` · due ${b.due_date}` : ""}
              </div>
            </div>

            <button
              onClick={() => deleteBill(b.id)}
              className="text-sm text-red-500"
            >
              Delete
            </button>
          </div>
        ))}
      </div>
    </main>
  );
}

function Card({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border bg-white p-4">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="text-2xl font-bold">${value.toFixed(2)}</div>
    </div>
  );
}
