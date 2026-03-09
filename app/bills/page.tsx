"use client";

import { useState } from "react";
import { useMoneyStore } from "@/lib/money/store";

export default function BillsPage() {
  const { buckets, addBucket } = useMoneyStore();

  const [name, setName] = useState("");
  const [amount, setAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [category, setCategory] = useState("other");

  function handleAdd() {
    if (!name || !amount) return;

    addBucket({
      key: crypto.randomUUID(),
      name,
      kind: "bill",
      target: Number(amount),
      saved: 0,
      dueDate,
      category: category as any
    });

    setName("");
    setAmount("");
    setDueDate("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-xl px-6 py-12">

        <h1 className="text-3xl font-black">Add Bill</h1>

        <div className="mt-6 grid gap-3">

          <input
            placeholder="Bill name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="rounded-xl border border-zinc-200 px-4 py-3"
          />

          <input
            placeholder="Amount"
            type="number"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="rounded-xl border border-zinc-200 px-4 py-3"
          />

          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="rounded-xl border border-zinc-200 px-4 py-3"
          />

          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="rounded-xl border border-zinc-200 px-4 py-3"
          >
            <option value="housing">Housing</option>
            <option value="utilities">Utilities</option>
            <option value="transportation">Transportation</option>
            <option value="debt">Debt</option>
            <option value="food">Food</option>
            <option value="other">Other</option>
          </select>

          <button
            onClick={handleAdd}
            className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white"
          >
            Add Bill
          </button>

        </div>

        <div className="mt-10">
          <h2 className="text-lg font-bold">Your Bills</h2>

          <div className="mt-4 grid gap-3">

            {buckets.map((b) => (
              <div
                key={b.key}
                className="rounded-xl border border-zinc-200 bg-white p-4"
              >
                <div className="font-semibold">{b.name}</div>
                <div className="text-sm text-zinc-500">
                  ${b.target} · Due {b.dueDate || "not set"}
                </div>
              </div>
            ))}

          </div>
        </div>

      </div>
    </main>
  );
}
