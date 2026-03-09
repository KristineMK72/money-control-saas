"use client";

import { useMemo, useState } from "react";
import { useMoneyStore } from "@/lib/money/store";
import { todayISO } from "@/lib/money/utils";

export default function IncomePage() {
  const { entries, incomeSources, addIncomeEntry, totals, removeIncomeEntry } =
    useMoneyStore();

  const [dateISO, setDateISO] = useState(todayISO());
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  const sortedSources = useMemo(
    () => [...incomeSources].sort((a, b) => a.name.localeCompare(b.name)),
    [incomeSources]
  );

  function handleAddIncome() {
    const amt = Number(amount);
    if (!sourceName.trim() || !Number.isFinite(amt) || amt <= 0) return;

    addIncomeEntry({
      dateISO,
      sourceName,
      amount: amt,
      note,
    });

    setAmount("");
    setNote("");
    setSourceName("");
    setDateISO(todayISO());
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Income</h1>
            <p className="mt-2 text-zinc-600">
              Add as many income sources as you want and name them your way.
            </p>
          </div>

          <a
            href="/dashboard"
            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
          >
            Back to Dashboard
          </a>
        </div>

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total income</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.income.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Income sources</div>
            <div className="mt-2 text-3xl font-black">{incomeSources.length}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Entries logged</div>
            <div className="mt-2 text-3xl font-black">{entries.length}</div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Add income</h2>

          <div className="mt-4 grid gap-3">
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <input
              list="income-sources"
              placeholder="Income source (Salon, DoorDash, Tax Refund, Tips)"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />
            <datalist id="income-sources">
              {sortedSources.map((source) => (
                <option key={source.id} value={source.name} />
              ))}
            </datalist>

            <input
              placeholder="Amount"
              type="number"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 outline-none focus:border-zinc-400"
            />

            <button
              onClick={handleAddIncome}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black"
            >
              Add Income
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Saved income sources</h2>

          <div className="mt-4 flex flex-wrap gap-2">
            {sortedSources.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No income sources yet.
              </div>
            ) : (
              sortedSources.map((source) => (
                <div
                  key={source.id}
                  className="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-medium"
                >
                  {source.name}
                </div>
              ))
            )}
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Income entries</h2>

          <div className="mt-4 grid gap-3">
            {entries.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No income logged yet.
              </div>
            ) : (
              entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{entry.sourceName}</div>
                    <div className="text-sm text-zinc-500">
                      {entry.dateISO}
                      {entry.note ? ` · ${entry.note}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      ${entry.amount.toFixed(2)}
                    </div>
                    <button
                      onClick={() => removeIncomeEntry(entry.id)}
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
