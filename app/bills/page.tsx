"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type BillRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "bill" | "credit" | "loan";
  category:
    | "housing"
    | "utilities"
    | "transportation"
    | "debt"
    | "food"
    | "other"
    | null;
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

export default function BillsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [bills, setBills] = useState<BillRow[]>([]);

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<
    "housing" | "utilities" | "transportation" | "debt" | "food" | "other"
  >("other");
  const [kind, setKind] = useState<"bill" | "credit" | "loan">("bill");

  useEffect(() => {
    async function init() {
      setLoading(true);
      setMessage("");

      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        setMessage(sessionError.message);
        setLoading(false);
        return;
      }

      if (!session?.user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(session.user.id);

      const { data, error } = await supabase
        .from("bills")
        .select("*")
        .order("due_date", { ascending: true, nullsFirst: false });

      if (error) {
        setMessage(error.message);
      } else {
        setBills((data || []) as BillRow[]);
      }

      setLoading(false);
    }

    init();
  }, []);

  async function refreshBills() {
    const { data, error } = await supabase
      .from("bills")
      .select("*")
      .order("due_date", { ascending: true, nullsFirst: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((data || []) as BillRow[]);
  }

  async function handleAdd() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const amt = Number(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Please enter a bill name and valid amount.");
      return;
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
    setMessage("Bill added.");

    await refreshBills();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    setMessage("");

    const { error } = await supabase.from("bills").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setBills((prev) => prev.filter((b) => b.id !== id));
  }

  const totals = useMemo(() => {
    return bills.reduce(
      (acc, bill) => {
        acc.total += Number(bill.target || 0);

        if (bill.due_date) {
          const due = new Date(`${bill.due_date}T12:00:00`);
          const now = new Date();
          const in7 = new Date();
          in7.setDate(now.getDate() + 7);

          if (due <= in7) acc.next7 += Number(bill.target || 0);
        } else {
          acc.noDate += Number(bill.target || 0);
        }

        return acc;
      },
      { total: 0, next7: 0, noDate: 0 }
    );
  }, [bills]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Bills</h1>
            <p className="mt-2 text-zinc-600">
              Add your real obligations so the app can rank what to pay first.
            </p>
          </div>

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Dashboard
            </a>

            <a
              href="/crisis"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Crisis Mode
            </a>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        {!userId && !loading ? (
          <div className="mt-6 rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="font-semibold">You are not logged in.</div>
            <p className="mt-2 text-sm text-zinc-600">
              Go to signup/login first, then come back here.
            </p>
            <div className="mt-4">
              <a
                href="/signup"
                className="inline-flex rounded-xl bg-zinc-900 px-4 py-3 text-sm font-semibold text-white hover:bg-black"
              >
                Go to Signup / Login
              </a>
            </div>
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total bills</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.total.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Due in next 7 days</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.next7.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">No due date set</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.noDate.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Add a bill</h2>

          <div className="mt-4 grid gap-3">
            <input
              placeholder="Bill name (Rent, Power, Car Payment)"
              value={name}
              onChange={(e) => setName(e.target.value)}
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
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <select
              value={category}
              onChange={(e) =>
                setCategory(
                  e.target.value as
                    | "housing"
                    | "utilities"
                    | "transportation"
                    | "debt"
                    | "food"
                    | "other"
                )
              }
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            >
              <option value="housing">Housing</option>
              <option value="utilities">Utilities</option>
              <option value="transportation">Transportation</option>
              <option value="debt">Debt</option>
              <option value="food">Food</option>
              <option value="other">Other</option>
            </select>

            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "bill" | "credit" | "loan")}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            >
              <option value="bill">Bill</option>
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>

            <button
              onClick={handleAdd}
              disabled={saving || !userId}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Bill"}
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Your bills</h2>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                Loading bills...
              </div>
            ) : bills.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No bills added yet.
              </div>
            ) : (
              bills.map((b) => (
                <div
                  key={b.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-sm text-zinc-500">
                      ${Number(b.target).toFixed(2)} · {b.category || "other"} ·{" "}
                      {b.kind}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="text-sm text-zinc-500">
                      Due {b.due_date || "not set"}
                    </div>
                    <button
                      onClick={() => handleDelete(b.id)}
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
    </main>
  );
}
