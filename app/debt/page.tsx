"use client";

import { useState } from "react";
import { useMoneyStore } from "@/lib/money/store";
import type { DebtEntry } from "@/lib/money/types";
import { ocrImageFile, parseDebtScreenshot } from "@/lib/money/receiptOcr";

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

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrError, setOcrError] = useState("");

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

  async function handleExtractDebt() {
    if (!imageFile) return;

    setOcrBusy(true);
    setOcrError("");

    try {
      const { text } = await ocrImageFile(imageFile);
      setOcrText(text);

      const parsed = parseDebtScreenshot(text);

      if (parsed.name) setName(parsed.name);
      if (parsed.balance != null) setBalance(String(parsed.balance));
      if (parsed.minPayment != null) setMinPayment(String(parsed.minPayment));
      if (parsed.dueDate) setDueDate(parsed.dueDate);
      if (parsed.apr != null) setApr(String(parsed.apr));
      if (parsed.creditLimit != null) setCreditLimit(String(parsed.creditLimit));
    } catch (err: any) {
      setOcrError(err?.message || "Failed to extract debt screenshot.");
    } finally {
      setOcrBusy(false);
    }
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
              Add debt accounts manually or use screenshots to fill the details.
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

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
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

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Import from screenshot</h2>

            <div className="mt-4 grid gap-3">
              <input
                type="file"
                accept="image/*"
                onChange={(e) => setImageFile(e.target.files?.[0] || null)}
                className="rounded-xl border border-zinc-200 px-4 py-3"
              />

              <button
                onClick={handleExtractDebt}
                disabled={!imageFile || ocrBusy}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 font-semibold hover:bg-zinc-100 disabled:opacity-50"
              >
                {ocrBusy ? "Extracting..." : "Extract debt details"}
              </button>

              {ocrError ? (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {ocrError}
                </div>
              ) : null}

              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-600">
                Use screenshots of card/loan screens that show balance, payment due,
                due date, APR, or credit limit.
              </div>

              {ocrText ? (
                <details className="rounded-xl bg-zinc-50 p-3 text-sm text-zinc-600">
                  <summary className="cursor-pointer font-semibold">
                    View extracted text
                  </summary>
                  <pre className="mt-3 whitespace-pre-wrap text-xs">{ocrText}</pre>
                </details>
              ) : null}
            </div>
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
