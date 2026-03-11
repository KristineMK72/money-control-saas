"use client";


import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import AppTabs from "@/components/AppTabs";
import { getNextDueDateFromDay } from "@/lib/money/recurring";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "bill" | "credit" | "loan";
  category: "housing" | "utilities" | "transportation" | "debt" | "food" | "other" | null;
  target: number;
  saved: number;
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

function effectiveBillDueDate(bill: BillRow) {
  if (bill.due_date) return bill.due_date;
  if (bill.is_monthly && bill.due_day) return getNextDueDateFromDay(bill.due_day);
  return null;
}

function effectiveBillAmount(bill: BillRow) {
  return Number(bill.monthly_target || bill.target || 0);
}

export default function BillsPage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<"housing" | "utilities" | "transportation" | "debt" | "food" | "other">("other");
  const [kind, setKind] = useState<"bill" | "credit" | "loan">("bill");
  const [isMonthly, setIsMonthly] = useState(false);
  const [dueDay, setDueDay] = useState("");
  const [monthlyTarget, setMonthlyTarget] = useState("");

  useEffect(() => {
    async function init() {
      setLoading(true);
      setMessage("");

      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }
      if (!session?.user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data, error: billsError } = await supabase
        .from("bills")
        .select("*")
        .order("created_at", { ascending: false });

      if (billsError) setMessage(billsError.message);
      else setBills((data || []) as BillRow[]);

      setLoading(false);
    }

    init();
  }, []);

  async function refreshBills() {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }
    setBills((data || []) as BillRow[]);
  }

  async function handleAdd() {
    setMessage("");

    if (!userId) return setMessage("You need to be logged in.");

    const amt = Number(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) {
      return setMessage("Please enter a bill name and valid amount.");
    }

    setSaving(true);

    const { error } = await supabase.from("bills").insert({
      user_id: userId,
      name: name.trim(),
      kind,
      category,
      target: amt,
      saved: 0,
      due_date: dueDate || null,
      focus: true,
      is_monthly: isMonthly,
      due_day: dueDay ? Number(dueDay) : null,
      monthly_target: monthlyTarget ? Number(monthlyTarget) : null,
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
    setKind("bill");
    setIsMonthly(false);
    setDueDay("");
    setMonthlyTarget("");
    setMessage("Bill added.");

    await refreshBills();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase.from("bills").delete().eq("id", id);
    if (error) return setMessage(error.message);
    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  const totals = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        const amount = effectiveBillAmount(bill);
        acc.total += amount;

        const due = effectiveBillDueDate(bill);
        if (!due) acc.noDate += amount;
        else {
          const dueDateObj = new Date(`${due}T12:00:00`);
          const in7 = new Date();
          in7.setDate(in7.getDate() + 7);
          if (dueDateObj <= in7) acc.next7 += amount;
        }

        return acc;
      },
      { total: 0, next7: 0, noDate: 0 }
    );
  }, [bills]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div>
          <h1 className="text-3xl font-black tracking-tight">Bills</h1>
          <p className="mt-2 text-zinc-600">Add your real obligations so the app can rank what to pay first.</p>
        </div>

        <AppTabs />

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">{message}</div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total bills</div>
            <div className="mt-2 text-3xl font-black">${totals.total.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Due in next 7 days</div>
            <div className="mt-2 text-3xl font-black">${totals.next7.toFixed(2)}</div>
          </div>
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">No due date/day set</div>
            <div className="mt-2 text-3xl font-black">${totals.noDate.toFixed(2)}</div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Add a bill</h2>

          <div className="mt-4 grid gap-3">
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Bill name (Rent, Power, Car Payment)" className="rounded-xl border border-zinc-200 px-4 py-3" />
            <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" type="number" inputMode="decimal" className="rounded-xl border border-zinc-200 px-4 py-3" />
            <input value={dueDate} onChange={(e) => setDueDate(e.target.value)} type="date" className="rounded-xl border border-zinc-200 px-4 py-3" />

            <label className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3">
              <input type="checkbox" checked={isMonthly} onChange={(e) => setIsMonthly(e.target.checked)} />
              <span className="text-sm font-medium">Monthly recurring</span>
            </label>

            <input value={dueDay} onChange={(e) => setDueDay(e.target.value)} placeholder="Due day (1-31)" type="number" inputMode="numeric" className="rounded-xl border border-zinc-200 px-4 py-3" />
            <input value={monthlyTarget} onChange={(e) => setMonthlyTarget(e.target.value)} placeholder="Monthly amount" type="number" inputMode="decimal" className="rounded-xl border border-zinc-200 px-4 py-3" />

            <select value={category} onChange={(e) => setCategory(e.target.value as any)} className="rounded-xl border border-zinc-200 px-4 py-3">
              <option value="housing">Housing</option>
              <option value="utilities">Utilities</option>
              <option value="transportation">Transportation</option>
              <option value="debt">Debt</option>
              <option value="food">Food</option>
              <option value="other">Other</option>
            </select>

            <select value={kind} onChange={(e) => setKind(e.target.value as any)} className="rounded-xl border border-zinc-200 px-4 py-3">
              <option value="bill">Bill</option>
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>

            <button onClick={handleAdd} disabled={saving || !userId} className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60">
              {saving ? "Saving..." : "Add Bill"}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Your bills</h2>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">Loading bills...</div>
            ) : bills.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">No bills added yet.</div>
            ) : (
              bills.map((b) => {
                const nextDue = effectiveBillDueDate(b);
                const activeAmount = effectiveBillAmount(b);

                return (
                  <div key={b.id} className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4">
                    <div>
                      <div className="font-semibold">{b.name}</div>
                      <div className="text-sm text-zinc-500">
                        ${activeAmount.toFixed(2)} · {b.category || "other"} · {b.kind}
                        {b.is_monthly ? " · monthly" : ""}
                        {nextDue ? ` · Next Due ${nextDue}` : ""}
                      </div>
                    </div>

                    <button onClick={() => handleDelete(b.id)} className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100">
                      Delete
                    </button>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
