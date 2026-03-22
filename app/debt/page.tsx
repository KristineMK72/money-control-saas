"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
  is_monthly: boolean | null;
  due_day: number | null;
  monthly_min_payment: number | null;
  created_at: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function getNextDueDateFromDay(dueDay?: number | null) {
  if (!dueDay || dueDay < 1 || dueDay > 31) return null;

  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();

  const lastDayThisMonth = new Date(year, month + 1, 0).getDate();
  const safeDayThisMonth = Math.min(dueDay, lastDayThisMonth);
  const thisMonthDue = new Date(year, month, safeDayThisMonth, 12, 0, 0, 0);

  if (
    thisMonthDue >=
    new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
  ) {
    return thisMonthDue.toISOString().slice(0, 10);
  }

  const nextMonthYear = month === 11 ? year + 1 : year;
  const nextMonth = month === 11 ? 0 : month + 1;
  const lastDayNextMonth = new Date(nextMonthYear, nextMonth + 1, 0).getDate();
  const safeDayNextMonth = Math.min(dueDay, lastDayNextMonth);
  const nextMonthDue = new Date(
    nextMonthYear,
    nextMonth,
    safeDayNextMonth,
    12,
    0,
    0,
    0
  );

  return nextMonthDue.toISOString().slice(0, 10);
}

function DonutChart({
  values,
  size = 180,
  stroke = 22,
  centerLabel = "total debt",
}: {
  values: { label: string; value: number }[];
  size?: number;
  stroke?: number;
  centerLabel?: string;
}) {
  const total = values.reduce((sum, v) => sum + v.value, 0);
  const radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;

  const palette = [
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#22c55e",
    "#e11d48",
    "#71717a",
  ];

  let cumulative = 0;

  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="#e5e7eb"
        strokeWidth={stroke}
      />

      {values.map((v, i) => {
        const fraction = total === 0 ? 0 : v.value / total;
        const dash = fraction * circumference;
        const gap = circumference - dash;
        const offset = -cumulative * circumference;
        cumulative += fraction;

        return (
          <circle
            key={v.label}
            cx={size / 2}
            cy={size / 2}
            r={radius}
            fill="none"
            stroke={palette[i % palette.length]}
            strokeWidth={stroke}
            strokeLinecap="butt"
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
          />
        );
      })}

      <text
        x="50%"
        y="48%"
        textAnchor="middle"
        className="fill-zinc-950"
        style={{ fontSize: 20, fontWeight: 800 }}
      >
        ${total.toFixed(0)}
      </text>

      <text
        x="50%"
        y="60%"
        textAnchor="middle"
        className="fill-zinc-500"
        style={{ fontSize: 12, fontWeight: 600 }}
      >
        {centerLabel}
      </text>
    </svg>
  );
}

export default function DebtPage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [debugUser, setDebugUser] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [debts, setDebts] = useState<DebtRow[]>([]);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [kind, setKind] = useState<"credit" | "loan">("credit");
  const [balance, setBalance] = useState("");
  const [minPayment, setMinPayment] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [apr, setApr] = useState("");
  const [creditLimit, setCreditLimit] = useState("");
  const [note, setNote] = useState("");

  const [isMonthly, setIsMonthly] = useState(true);
  const [dueDay, setDueDay] = useState("");
  const [monthlyMinPayment, setMonthlyMinPayment] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [ocrError, setOcrError] = useState("");

  const [payingDebtId, setPayingDebtId] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payDate, setPayDate] = useState(todayISO());
  const [payNote, setPayNote] = useState("");
  const [paySaving, setPaySaving] = useState(false);

  function resetForm() {
    setEditingId(null);
    setName("");
    setKind("credit");
    setBalance("");
    setMinPayment("");
    setDueDate("");
    setApr("");
    setCreditLimit("");
    setNote("");
    setIsMonthly(true);
    setDueDay("");
    setMonthlyMinPayment("");
    setImageFile(null);
    setOcrText("");
    setOcrError("");
  }

  function resetPayForm() {
    setPayingDebtId(null);
    setPayAmount("");
    setPayDate(todayISO());
    setPayNote("");
  }

  function loadDebtIntoForm(debt: DebtRow) {
    setEditingId(debt.id);
    setName(debt.name || "");
    setKind(debt.kind || "credit");
    setBalance(String(debt.balance ?? ""));
    setMinPayment(
      debt.min_payment !== null && debt.min_payment !== undefined
        ? String(debt.min_payment)
        : ""
    );
    setDueDate(debt.due_date || "");
    setApr(
      debt.apr !== null && debt.apr !== undefined ? String(debt.apr) : ""
    );
    setCreditLimit(
      debt.credit_limit !== null && debt.credit_limit !== undefined
        ? String(debt.credit_limit)
        : ""
    );
    setNote(debt.note || "");
    setIsMonthly(Boolean(debt.is_monthly));
    setDueDay(
      debt.due_day !== null && debt.due_day !== undefined
        ? String(debt.due_day)
        : ""
    );
    setMonthlyMinPayment(
      debt.monthly_min_payment !== null && debt.monthly_min_payment !== undefined
        ? String(debt.monthly_min_payment)
        : ""
    );
    setMessage("Editing debt account.");
  }

  function startPayDebt(debt: DebtRow) {
    setPayingDebtId(debt.id);
    setPayAmount(
      debt.monthly_min_payment != null
        ? String(debt.monthly_min_payment)
        : debt.min_payment != null
        ? String(debt.min_payment)
        : ""
    );
    setPayDate(todayISO());
    setPayNote("");
    setMessage(`Recording payment for ${debt.name}.`);
  }

  async function refreshDebts(currentUserId: string) {
    const { data, error } = await supabase
      .from("debts")
      .select("*")
      .eq("user_id", currentUserId)
      .order("created_at", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setDebts((data || []) as DebtRow[]);
  }

  useEffect(() => {
    let mounted = true;

    async function init() {
      setLoading(true);
      setMessage("");

      const {
        data: { user },
        error,
      } = await supabase.auth.getUser();

      if (!mounted) return;

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      if (!user) {
        window.location.href = "/signup?mode=login";
        return;
      }

      setDebugUser(`${user.email || "unknown"} · ${user.id}`);
      setUserId(user.id);

      await refreshDebts(user.id);

      if (mounted) {
        setLoading(false);
      }
    }

    init();

    return () => {
      mounted = false;
    };
  }, [supabase]);

  async function handleSaveDebt() {
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

    const payload = {
      user_id: userId,
      name: name.trim(),
      kind,
      balance: bal,
      min_payment: minPayment ? Number(minPayment) : null,
      due_date: dueDate || null,
      apr: apr ? Number(apr) : null,
      credit_limit: creditLimit ? Number(creditLimit) : null,
      note: note.trim() || null,
      is_monthly: isMonthly,
      due_day: dueDay ? Number(dueDay) : null,
      monthly_min_payment: monthlyMinPayment
        ? Number(monthlyMinPayment)
        : null,
    };

    if (editingId) {
      const { error } = await supabase
        .from("debts")
        .update(payload)
        .eq("id", editingId)
        .eq("user_id", userId);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage("Debt account updated.");
    } else {
      const { error } = await supabase.from("debts").insert(payload);

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setMessage("Debt account added.");
    }

    resetForm();
    await refreshDebts(userId);
    setSaving(false);
  }

  async function handleDeleteDebt(id: string) {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const { error } = await supabase
      .from("debts")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    if (editingId === id) {
      resetForm();
    }

    if (payingDebtId === id) {
      resetPayForm();
    }

    setDebts((prev) => prev.filter((debt) => debt.id !== id));
    setMessage("Debt account deleted.");
  }

  async function handlePayDebt(debt: DebtRow) {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const amt = Number(payAmount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid payment amount.");
      return;
    }

    setPaySaving(true);

    const { error } = await supabase.from("payments").insert({
      user_id: userId,
      merchant: debt.name,
      amount: amt,
      date_iso: payDate || todayISO(),
      debt_id: debt.id,
      note: payNote.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setPaySaving(false);
      return;
    }

    resetPayForm();
    setMessage(`Payment recorded for ${debt.name}.`);
    setPaySaving(false);
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
      if (parsed.minPayment != null) {
        setMinPayment(String(parsed.minPayment));
        setMonthlyMinPayment(String(parsed.minPayment));
      }
      if (parsed.dueDate) setDueDate(parsed.dueDate);
      if (parsed.apr != null) setApr(String(parsed.apr));
      if (parsed.creditLimit != null) {
        setCreditLimit(String(parsed.creditLimit));
      }
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
        acc.minimums += Number(
          debt.monthly_min_payment || debt.min_payment || 0
        );
        return acc;
      },
      { balance: 0, minimums: 0 }
    );
  }, [debts]);

  const debtChartValues = useMemo(() => {
    return debts
      .map((debt) => ({
        label: debt.name,
        value: Number(debt.balance || 0),
      }))
      .filter((item) => item.value > 0)
      .sort((a, b) => b.value - a.value);
  }, [debts]);

  const palette = [
    "#06b6d4",
    "#3b82f6",
    "#8b5cf6",
    "#f59e0b",
    "#ef4444",
    "#22c55e",
    "#e11d48",
    "#71717a",
  ];

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">
              Credit & Loans
            </h1>
            <p className="mt-2 text-zinc-600">
              Add, edit, or import debt accounts. Monthly recurring cards will
              carry into future months in Calendar.
            </p>
            {debugUser ? (
              <p className="mt-2 text-xs text-zinc-400">
                Logged in as: {debugUser}
              </p>
            ) : null}
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

            <a
              href="/calendar"
              className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
            >
              Calendar
            </a>
          </div>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border border-zinc-200 bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 lg:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total debt balance</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.balance.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Monthly minimums</div>
            <div className="mt-2 text-3xl font-black">
              ${totals.minimums.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Debt breakdown</div>

            <div className="mt-4 flex justify-center">
              <DonutChart values={debtChartValues} centerLabel="total debt" />
            </div>

            <div className="mt-4 space-y-2">
              {debtChartValues.slice(0, 5).map((item, i) => (
                <div
                  key={item.label}
                  className="flex items-center justify-between text-sm"
                >
                  <div className="flex items-center gap-2">
                    <span
                      className="inline-block h-3 w-3 rounded-full"
                      style={{ backgroundColor: palette[i % palette.length] }}
                    />
                    <span className="text-zinc-600">{item.label}</span>
                  </div>
                  <span className="font-semibold">${item.value.toFixed(2)}</span>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-2">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h2 className="text-lg font-bold">
                {editingId ? "Edit debt account" : "Add debt account"}
              </h2>

              {editingId ? (
                <button
                  type="button"
                  onClick={resetForm}
                  className="rounded-xl border border-zinc-200 bg-white px-4 py-2 text-sm font-semibold hover:bg-zinc-100"
                >
                  Cancel Edit
                </button>
              ) : null}
            </div>

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
                placeholder="Minimum payment (current)"
                type="number"
                inputMode="decimal"
                value={minPayment}
                onChange={(e) => setMinPayment(e.target.value)}
                className="rounded-xl border border-zinc-200 px-4 py-3"
              />

              <label className="flex items-center gap-3 rounded-xl border border-zinc-200 px-4 py-3">
                <input
                  type="checkbox"
                  checked={isMonthly}
                  onChange={(e) => setIsMonthly(e.target.checked)}
                />
                <span className="text-sm font-medium">Monthly recurring</span>
              </label>

              <input
                placeholder="Due day (1-31)"
                type="number"
                inputMode="numeric"
                value={dueDay}
                onChange={(e) => setDueDay(e.target.value)}
                className="rounded-xl border border-zinc-200 px-4 py-3"
              />

              <input
                placeholder="Monthly minimum payment"
                type="number"
                inputMode="decimal"
                value={monthlyMinPayment}
                onChange={(e) => setMonthlyMinPayment(e.target.value)}
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
                onClick={handleSaveDebt}
                disabled={saving || !userId}
                className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60 md:col-span-2"
              >
                {saving
                  ? editingId
                    ? "Updating..."
                    : "Saving..."
                  : editingId
                  ? "Update Credit / Loan"
                  : "Add Credit / Loan"}
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
                  <pre className="mt-3 whitespace-pre-wrap text-xs">
                    {ocrText}
                  </pre>
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
              debts.map((debt) => {
                const nextDue =
                  debt.due_date || getNextDueDateFromDay(debt.due_day);
                const isPaying = payingDebtId === debt.id;

                return (
                  <div key={debt.id} className="rounded-2xl bg-zinc-50 p-4">
                    <div className="flex items-center justify-between gap-4">
                      <div>
                        <div className="font-semibold">{debt.name}</div>
                        <div className="text-sm text-zinc-500">
                          {debt.kind} · Balance ${Number(debt.balance).toFixed(2)}
                          {debt.monthly_min_payment != null
                            ? ` · Monthly Min $${Number(
                                debt.monthly_min_payment
                              ).toFixed(2)}`
                            : debt.min_payment != null
                            ? ` · Min $${Number(debt.min_payment).toFixed(2)}`
                            : ""}
                          {nextDue ? ` · Next Due ${nextDue}` : ""}
                          {debt.apr != null
                            ? ` · APR ${Number(debt.apr).toFixed(2)}%`
                            : ""}
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => startPayDebt(debt)}
                          className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700 hover:bg-emerald-100"
                        >
                          Pay
                        </button>

                        <button
                          onClick={() => loadDebtIntoForm(debt)}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                        >
                          Edit
                        </button>

                        <button
                          onClick={() => handleDeleteDebt(debt.id)}
                          className="rounded-lg border border-zinc-200 bg-white px-3 py-2 text-xs font-semibold hover:bg-zinc-100"
                        >
                          Delete
                        </button>
                      </div>
                    </div>

                    {isPaying ? (
                      <div className="mt-4 grid gap-3 rounded-2xl border border-emerald-200 bg-white p-4 md:grid-cols-4">
                        <input
                          placeholder="Payment amount"
                          type="number"
                          inputMode="decimal"
                          value={payAmount}
                          onChange={(e) => setPayAmount(e.target.value)}
                          className="rounded-xl border border-zinc-200 px-4 py-3"
                        />

                        <input
                          type="date"
                          value={payDate}
                          onChange={(e) => setPayDate(e.target.value)}
                          className="rounded-xl border border-zinc-200 px-4 py-3"
                        />

                        <input
                          placeholder="Note (optional)"
                          value={payNote}
                          onChange={(e) => setPayNote(e.target.value)}
                          className="rounded-xl border border-zinc-200 px-4 py-3 md:col-span-2"
                        />

                        <div className="md:col-span-4 flex flex-wrap gap-2">
                          <button
                            onClick={() => handlePayDebt(debt)}
                            disabled={paySaving}
                            className="rounded-xl bg-emerald-600 px-4 py-3 text-sm font-semibold text-white hover:bg-emerald-700 disabled:opacity-60"
                          >
                            {paySaving ? "Recording..." : "Record Payment"}
                          </button>

                          <button
                            onClick={resetPayForm}
                            disabled={paySaving}
                            className="rounded-xl border border-zinc-200 bg-white px-4 py-3 text-sm font-semibold hover:bg-zinc-100"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    ) : null}
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
