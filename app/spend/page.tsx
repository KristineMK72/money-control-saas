import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/money/utils";
import type { SpendCategory } from "@/lib/money/types";
import {
  guessCategoryFromMerchant,
  ocrImageFile,
  parseTransactionsScreenshot,
  type ParsedTxn,
} from "@/lib/money/receiptOcr";

type SpendRow = {
  id: string;
  user_id: string;
  date_iso: string;
  merchant: string | null;
  amount: number;
  category: SpendCategory;
  note: string | null;
  created_at: string;
};

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

const CATEGORY_LABEL: Record<SpendCategory, string> = {
  groceries: "Groceries",
  gas: "Gas",
  eating_out: "Eating Out",
  kids: "Kids",
  business: "Business",
  self_care: "Self Care",
  subscriptions: "Subscriptions",
  misc: "Misc",
};

function DonutChart({
  values,
  size = 180,
  stroke = 22,
}: {
  values: { label: string; value: number }[];
  size?: number;
  stroke?: number;
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
        stroke="rgba(0,0,0,0.08)"
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
            strokeDasharray={`${dash} ${gap}`}
            strokeDashoffset={offset}
            transform={`rotate(-90 ${size / 2} ${size / 2})`}
            strokeLinecap="butt"
          />
        );
      })}

      <text
        x="50%"
        y="48%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="16"
        fill="currentColor"
        style={{ fontWeight: 800 }}
      >
        ${total.toFixed(2)}
      </text>
      <text
        x="50%"
        y="60%"
        dominantBaseline="middle"
        textAnchor="middle"
        fontSize="11"
        fill="rgba(0,0,0,0.55)"
      >
        total spend
      </text>
    </svg>
  );
}

export default function SpendPage() {
  const supabase = createSupabaseBrowserClient();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

  const [entries, setEntries] = useState<SpendRow[]>([]);

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
        .from("spend_entries")
        .select("*")
        .order("date_iso", { ascending: false });

      if (error) {
        setMessage(error.message);
      } else {
        setEntries((data || []) as SpendRow[]);
      }

      setLoading(false);
    }

    init();
  }, []);

  async function refreshSpend() {
    const { data, error } = await supabase
      .from("spend_entries")
      .select("*")
      .order("date_iso", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((data || []) as SpendRow[]);
  }

  async function handleAddSpend() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setMessage("Please enter a valid amount.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("spend_entries").insert({
      user_id: userId,
      date_iso: dateISO,
      merchant: merchant.trim() || null,
      amount: amt,
      category,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setDateISO(todayISO());
    setMerchant("");
    setAmount("");
    setCategory("misc");
    setNote("");
    setMessage("Spending added.");

    await refreshSpend();
    setSaving(false);
  }

  async function handleDeleteSpend(id: string) {
    setMessage("");

    const { error } = await supabase.from("spend_entries").delete().eq("id", id);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== id));
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

  async function importSelectedTxns() {
    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const spendInserts: Array<{
        user_id: string;
        date_iso: string;
        merchant: string;
        amount: number;
        category: SpendCategory;
        note: string;
      }> = [];

      const paymentInserts: Array<{
        user_id: string;
        date_iso: string;
        merchant: string;
        amount: number;
        note: string;
      }> = [];

      foundTxns.forEach((txn, idx) => {
        if (!selectedTxns[idx]) return;

        if (txn.direction === "debit") {
          spendInserts.push({
            user_id: userId,
            date_iso: todayISO(),
            merchant: txn.merchant,
            amount: txn.amount,
            category: guessCategoryFromMerchant(txn.merchant),
            note: txn.pending
              ? "Imported from screenshot · pending"
              : "Imported from screenshot",
          });
        } else {
          paymentInserts.push({
            user_id: userId,
            date_iso: todayISO(),
            merchant: txn.merchant,
            amount: txn.amount,
            note: "Imported payment/credit from screenshot",
          });
        }
      });

      if (spendInserts.length > 0) {
        const { error } = await supabase.from("spend_entries").insert(spendInserts);
        if (error) throw new Error(error.message);
      }

      if (paymentInserts.length > 0) {
        const { error } = await supabase.from("payments").insert(paymentInserts);
        if (error) throw new Error(error.message);
      }

      setFoundTxns([]);
      setSelectedTxns({});
      setImageFile(null);
      setOcrText("");
      setMessage("Imported selected screenshot items.");

      await refreshSpend();
    } catch (err: any) {
      setMessage(err?.message || "Failed to import screenshot items.");
    } finally {
      setSaving(false);
    }
  }

  const totalSpend = useMemo(() => {
    return entries.reduce((sum, entry) => sum + Number(entry.amount || 0), 0);
  }, [entries]);

  const categoryTotals = useMemo(() => {
    const totals: Record<SpendCategory, number> = {
      groceries: 0,
      gas: 0,
      eating_out: 0,
      kids: 0,
      business: 0,
      self_care: 0,
      subscriptions: 0,
      misc: 0,
    };

    entries.forEach((entry) => {
      totals[entry.category] += Number(entry.amount || 0);
    });

    return totals;
  }, [entries]);

  const donutData = useMemo(() => {
    return Object.entries(categoryTotals)
      .map(([key, value]) => ({
        label: CATEGORY_LABEL[key as SpendCategory],
        value,
      }))
      .filter((item) => item.value > 0);
  }, [categoryTotals]);

  const sortedCategoryRows = useMemo(() => {
    return (Object.entries(categoryTotals) as [SpendCategory, number][])
      .map(([key, value]) => ({
        key,
        label: CATEGORY_LABEL[key],
        value,
      }))
      .sort((a, b) => b.value - a.value);
  }, [categoryTotals]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-6xl px-6 py-10">
        <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
          <div>
            <h1 className="text-3xl font-black tracking-tight">Spending</h1>
            <p className="mt-2 text-zinc-600">
              Add spending manually or import it from screenshots.
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

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Total spending</div>
            <div className="mt-2 text-3xl font-black">
              ${totalSpend.toFixed(2)}
            </div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Entries</div>
            <div className="mt-2 text-3xl font-black">{entries.length}</div>
          </div>

          <div className="rounded-2xl border border-zinc-200 bg-white p-5 shadow-sm">
            <div className="text-sm text-zinc-500">Top category</div>
            <div className="mt-2 text-3xl font-black">
              {sortedCategoryRows.find((row) => row.value > 0)?.label || "—"}
            </div>
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
                disabled={saving || !userId}
                className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60"
              >
                {saving ? "Saving..." : "Add Spending"}
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
                    disabled={saving}
                    className="mt-4 rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white hover:bg-black disabled:opacity-60"
                  >
                    {saving ? "Importing..." : "Import Selected"}
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

        <div className="mt-8 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Spending entries</h2>

            <div className="mt-4 grid gap-3">
              {loading ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  Loading spending...
                </div>
              ) : entries.length === 0 ? (
                <div className="rounded-2xl bg-zinc-50 p-4 text-sm text-zinc-500">
                  No spending logged yet.
                </div>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                  >
                    <div>
                      <div className="font-semibold">
                        {entry.merchant || "Unnamed purchase"}
                      </div>
                      <div className="text-sm text-zinc-500">
                        {entry.date_iso} · {CATEGORY_LABEL[entry.category]}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="font-semibold">
                        ${Number(entry.amount).toFixed(2)}
                      </div>
                      <button
                        onClick={() => handleDeleteSpend(entry.id)}
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

          <div className="rounded-3xl border border-zinc-200 bg-white p-6 shadow-sm">
            <h2 className="text-lg font-bold">Where your money is going</h2>

            <div className="mt-6 flex flex-col items-center gap-6">
              <DonutChart values={donutData} />

              <div className="w-full grid gap-2">
                {sortedCategoryRows.map((row) => (
                  <div
                    key={row.key}
                    className="flex items-center justify-between rounded-xl bg-zinc-50 px-4 py-3"
                  >
                    <div className="text-sm font-medium">{row.label}</div>
                    <div className="text-sm font-semibold">
                      ${row.value.toFixed(2)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}
