"use client";

import { useState } from "react";
import { useMoneyStore } from "@/lib/money/store";
import type { SpendCategory, SpendEntry } from "@/lib/money/types";
import { todayISO } from "@/lib/money/utils";
import {
  guessCategoryFromMerchant,
  ocrImageFile,
  parseTransactionsScreenshot,
  type ParsedTxn,
} from "@/lib/money/receiptOcr";

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
  const { spend, totals, addSpend, addPayment, removeSpend } = useMoneyStore();

  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("misc");
  const [note, setNote] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [foundTxns, setFoundTxns] = useState<ParsedTxn[]>([]);
  const [selectedTxns, setSelectedTxns] = useState<Record<number, boolean>>({});
  const [ocrError, setOcrError] = useState("");

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

  async function handleExtractScreenshot() {
    if (!imageFile) return;

    setOcrBusy(true);
    setOcrError("");
    setFoundTxns([]);
    setSelectedTxns({});

    try {
      const { text } = await ocrImageFile(imageFile);
      setOcrText(text);

      const parsed = parseTransactionsScreenshot(text);
      setFoundTxns(parsed);

      const nextSelected: Record<number, boolean> = {};
      parsed.forEach((txn, idx) => {
        nextSelected[idx] = txn.direction === "debit";
      });
      setSelectedTxns(nextSelected);
    } catch (err: any) {
      setOcrError(err?.message || "Failed to extract screenshot.");
    } finally {
      setOcrBusy(false);
    }
  }

  function toggleTxn(idx: number) {
    setSelectedTxns((prev) => ({ ...prev, [idx]: !prev[idx] }));
  }

  function importSelectedTxns() {
    foundTxns.forEach((txn, idx) => {
      if (!selectedTxns[idx]) return;

      if (txn.direction === "debit") {
        addSpend({
          id: crypto.randomUUID(),
          dateISO: todayISO(),
          merchant: txn.merchant,
          amount: txn.amount,
          category: guessCategoryFromMerchant(txn.merchant),
          note: txn.pending ? "Imported from screenshot · pending" : "Imported from screenshot",
        });
      } else {
        addPayment({
          id: crypto.randomUUID(),
          dateISO: todayISO(),
          amount: txn.amount,
          merchant: txn.merchant,
          note: "Imported payment/credit from screenshot",
        });
      }
    });

    setFoundTxns([]);
    setSelectedTxns({});
    setImageFile(null);
    setOcrText("");
  }

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-5xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Spending</h1>
            <p className="mt-2 text-zinc-600">
              Add spending manually or import it from screenshots.
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

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Add spending manually</h2>

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
                onClick={handleExtractScreenshot}
                disabled={!imageFile || ocrBusy}
                className="rounded-xl border border-zinc-200 bg-white px-4 py-3 font-semibold hover:bg-zinc-100 disabled:opacity-50"
              >
                {ocrBusy ? "Extracting..." : "Extract from screenshot"}
              </button>

              {ocrError ? (
                <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700">
                  {ocrError}
                </div>
              ) : null}

              {foundTxns.length > 0 ? (
                <div className="rounded-2xl bg-zinc-50 p-4">
                  <div className="mb-3 font-semibold">
                    Found {foundTxns.length} transactions
                  </div>

                  <div className="grid gap-3">
                    {foundTxns.map((txn, idx) => (
                      <label
                        key={idx}
                        className="flex items-start gap-3 rounded-xl border border-zinc-200 bg-white p-3"
                      >
                        <input
                          type="checkbox"
                          checked={!!selectedTxns[idx]}
                          onChange={() => toggleTxn(idx)}
                          className="mt-1"
                        />

                        <div className="flex-1">
                          <div className="font-semibold">{txn.merchant}</div>
                          <div className="text-sm text-zinc-500">
                            {txn.direction === "credit" ? "Payment/Credit" : "Spend"} · $
                            {txn.amount.toFixed(2)}
                            {txn.pending ? " · Pending" : ""}
                            {txn.dateText ? ` · ${txn.dateText}` : ""}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>

                  <button
                    onClick={importSelectedTxns}
                    className="mt-4 rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black"
                  >
                    Import Selected
                  </button>
                </div>
              ) : null}

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
