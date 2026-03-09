"use client";

import { useState } from "react";
import { useMoneyStore } from "@/lib/money/store";
import type { DebtEntry } from "@/lib/money/types";

export default function DebtPage() {
  const { debts, totals, addDebt, removeDebt } = useMoneyStore();

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"credit" | "loan">("credit");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [apr, setApr] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [note, setNote] = useState("");

  function handleAddDebt() {
    const bal = Number(balance);
    if (!name.trim() || !Number.isFinite(bal) || bal < 0) return;

    const entry: DebtEntry = {
      id: crypto.randomUUID(),
      name: name.trim(),
      kind,
      balance: bal,
      minPayment: minPayment ? Number(minPayment) : undefined,
      dueDate: dueDate || undefined,
      apr: apr ? Number(apr) : undefined,
      creditLimit: creditLimit ? Number(creditLimit) : undefined,
      note: note.trim() || undefined,
    };

    addDebt(entry);

    setName("");
    setKind("credit");
    setBalance("");
    setMinPayment("");
    setDueDate("");
    setApr("");
    setCreditLimit("");
    setNote("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Credit & Loans
            </h1>
            <p className="mt-2 text-zinc-600">
              Add debt accounts manually now. Screenshot-assisted extraction comes next.
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
            <div className="text-sm text-zinc-500">Total debt balance</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.debtBalance.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Minimums due</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.debtMinimums.toFixed(2)}
            </div>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Add debt account</h2>

          <div className="mt-4 grid gap-3 md:grid-cols-2">
            <input
              placeholder="Name (Credit One, Car Loan, Chase)"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <select
              value={kind}
              onChange={(e) => setKind(e.target.value as "credit" | "loan")}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            >
              <option value="credit">Credit Card</option>
              <option value="loan">Loan</option>
            </select>

            <input
              placeholder="Balance"
              type="number"
              inputMode="decimal"
              value={balance}
              onChange={(e) => setBalance(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <input
              placeholder="Minimum payment"
              type="number"
              inputMode="decimal"
              value={minPayment}
              onChange={(e) => setMinPayment(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <input
              placeholder="APR"
              type="number"
              inputMode="decimal"
              value={apr}
              onChange={(e) => setApr(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3"
            />

            <input
              placeholder="Credit limit (optional)"
              type="number"
              inputMode="decimal"
              value={creditLimit}
              onChange={(e) => setCreditLimit(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 md:col-span-2"
            />

            <input
              placeholder="Note (optional)"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-zinc-200 px-4 py-3 md:col-span-2"
            />

            <button
              onClick={handleAddDebt}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black md:col-span-2"
            >
              Add Credit / Loan
            </button>
          </div>
        </div>

        <div className="mt-8 rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
          <h2 className="text-lg font-bold">Debt accounts</h2>

          <div className="mt-4 grid gap-3">
            {debts.length === 0 ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                No debt accounts added yet.
              </div>
            ) : (
              debts.map((debt) => (
                <div
                  key={debt.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{debt.name}</div>
                    <div className="text-sm text-zinc-500">
                      {debt.kind} · Balance ${debt.balance.toFixed(2)}
                      {debt.minPayment != null
                        ? ` · Min ${debt.minPayment.toFixed(2)}`
                        : ""}
                      {debt.dueDate ? ` · Due ${debt.dueDate}` : ""}
                      {debt.apr != null ? ` · APR ${debt.apr}%` : ""}
                    </div>
                  </div>

                  <button
                    onClick={() => removeDebt(debt.id)}
                    className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                  >
                    Delete
                  </button>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
