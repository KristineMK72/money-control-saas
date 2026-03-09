"use client";

import { useState } from "react";
import { useMoneyStore } from "@/lib/money/store";
import type { SpendCategory, SpendEntry } from "@/lib/money/types";
import { todayISO } from "@/lib/money/utils";

const categories: SpendCategory[] = [
  "groceries",
  "gas",
  "eating_out",
  "kids",
  "business",
  "self_care",
  "subscriptions",
  "misc",
];

export default function SpendPage() {
  const { spend, totals, addSpend, removeSpend } = useMoneyStore();

  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("misc");
  const [note, setNote] = useState("");

  function handleAddSpend() {
    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) return;

    const entry: SpendEntry = {
      id: crypto.randomUUID(),
      dateISO,
      merchant: merchant.trim() || undefined,
      amount: amt,
      category,
      note: note.trim() || undefined,
    };

    addSpend(entry);

    setDateISO(todayISO());
    setMerchant("");
    setAmount("");
    setCategory("misc");
    setNote("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Spending</h1>
            <p className="mt-2 text-zinc-600">
              Add daily spending manually now. Screenshot import comes next.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total spending</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.spending.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Entries</div>
            <div className="mt-2 text-3xl font-black">{spend.length}</div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Add spending</h2>

          <div className="mt-4 grid gap-3">
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <input
              placeholder="Merchant (McDonald's, Target, Speedway)"
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <input
              placeholder="Amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpendCategory)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            >
              {categories.map((item) => (
                <option key={item} value={item}>
                  {item.replaceAll("_", " ")}
                </option>
              ))}
            </select>

            <input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <button
              onClick={handleAddSpend}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black"
            >
              Add Spending
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Spending entries</h2>

          <div className="mt-4 grid gap-3">
            {spend.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No spending logged yet.
              </div>
            ) : (
              spend.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">
                      {entry.merchant || "Unnamed purchase"}
                    </div>
                    <div className="text-sm text-zinc-500">
                      {entry.dateISO} · {entry.category.replaceAll("_", " ")}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      ${entry.amount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeSpend(entry.id)}
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
