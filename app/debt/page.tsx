"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ocrImageFile, parseDebtScreenshot } from "@/lib/money/receiptOcr";

type DebtRow = {
  id: string;
  user_id: string;
  name: string;
  kind: "credit" | "loan";
  balance: number;
  min_payment: number | null;
  due_date: string | null;
  apr: number | null;
  credit_limit: number | null;
  note: string | null;
  created_at: string;
};

export default function DebtPage() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [debts, setDebts] = useState<DebtRow[]>([]);

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
        .from("debts")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) {
        setMessage(error.message);
      } else {
        setDebts((data || []) as DebtRow[]);
      }

      setLoading(false);
    }

    init();
  }, []);

  async function refreshDebts() {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setDebts((data || []) as DebtRow[]);
  }

  async function handleAddDebt() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const bal = Number(balance);
    if (!name.trim() || !Number.isFinite(bal) || bal < 0) {
      setMessage("Please enter an account name and valid balance.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("debts").insert({
      user_id: userId,
      name: name.trim(),
      kind,
      balance: bal,
      min_payment: minPayment ? Number(minPayment) : null,
      due_date: dueDate || null,
      apr: apr ? Number(apr) : null,
      credit_limit: creditLimit ? Number(creditLimit) : null,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setName("");
    setKind("credit");
    setBalance("");
    setMinPayment("");
    setDueDate("");
    setApr("");
    setCreditLimit("");
    setNote("");
    setMessage("Debt account added.");

    await refreshDebts();
    setSaving(false);
  }

  async function handleDeleteDebt(id: string) {
    setMessage("");

    const { error } = await supabase.from("debts").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setDebts((prev) => prev.filter((debt) => debt.id !== id));
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

  const totals = useMemo(() => {
    return debts.reduce(
      (acc, debt) => {
        acc.balance += Number(debt.balance || 0);
        acc.minimums += Number(debt.min_payment || 0);
        return acc;
      },
      { balance: 0, minimums: 0 }
    );
  }, [debts]);

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

          <div className="flex flex-wrap gap-3">
            <a
              href="/dashboard"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Dashboard
            </a>

            <a
              href="/forecast"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Forecast
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

        <div className="mt-8 grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total debt balance</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.balance.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Minimums due</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.minimums.toFixed(2)}
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
                disabled={saving || !userId}
                className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60 md:col-span-2"
              >
                {saving ? "Saving..." : "Add Credit / Loan"}
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
                Use screenshots of card or loan screens that show balance,
                payment due, due date, APR, or credit limit.
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
            {loading ? (
              <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                Loading debts...
              </div>
            ) : debts.length === 0 ? (
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
                      {debt.kind} · Balance ${Number(debt.balance).toFixed(2)}
                      {debt.min_payment != null
                        ? ` · Min ${Number(debt.min_payment).toFixed(2)}`
                        : ""}
                      {debt.due_date ? ` · Due ${debt.due_date}` : ""}
                      {debt.apr != null ? ` · APR ${Number(debt.apr).toFixed(2)}%` : ""}
                    </div>
                  </div>

                  <button
                    onClick={() => handleDeleteDebt(debt.id)}
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
