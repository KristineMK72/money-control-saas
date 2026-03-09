"use client";

import { useState } from "react";
import { useMoneyStore } from "@/lib/money/store";
import type { Bucket } from "@/lib/money/types";

export default function BillsPage() {
  const { buckets, addBucket } = useMoneyStore();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState<
    "housing" | "utilities" | "transportation" | "debt" | "food" | "other"
  >("other");
  const [kind, setKind] = useState<"bill" | "credit" | "loan">("bill");

  function handleAdd() {
    const amt = Number(amount);
    if (!name.trim() || !Number.isFinite(amt) || amt <= 0) return;

    const bucket: Bucket = {
      key: crypto.randomUUID(),
      name: name.trim(),
      kind,
      target: amt,
      saved: 0,
      dueDate: dueDate || undefined,
      category,
      focus: true,
    };

    addBucket(bucket);

    setName("");
    setAmount("");
    setDueDate("");
    setCategory("other");
    setKind("bill");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-3xl px-6 py-10">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Bills</h1>
            <p className="mt-2 text-zinc-600">
              Add your real obligations so the app can show what to pay first.
            </p>
          </div>

          <a
            href="/crisis"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Open Crisis Mode
          </a>
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
              onChange={(e) =>
                setKind(e.target.value as "bill" | "credit" | "loan")
              }
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            >
              <option value="bill">Bill</option>
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>

            <button
              onClick={handleAdd}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black"
            >
              Add Bill
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Your bills</h2>

          <div className="mt-4 grid gap-3">
            {buckets.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No bills added yet. Add one above to start your priority plan.
              </div>
            ) : (
              buckets.map((b) => (
                <div
                  key={b.key}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{b.name}</div>
                    <div className="text-sm text-zinc-500">
                      ${b.target.toFixed(2)} · {b.category || "other"} ·{" "}
                      {b.kind}
                    </div>
                  </div>
                  <div className="text-sm text-zinc-500">
                    Due {b.dueDate || "not set"}
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
