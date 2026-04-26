"use client";

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

/* ─────────────────────────────
   TYPES
──────────────────────────── */

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

/* ─────────────────────────────
   CATEGORY CONSTANTS
──────────────────────────── */

const categories: SpendCategory[] = [
  "groceries",
  "gas",
  "eating_out",
  "bills",
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
  bills: "Bills",
  kids: "Kids",
  business: "Business",
  self_care: "Self Care",
  subscriptions: "Subscriptions",
  misc: "Misc",
};

/* ─────────────────────────────
   DONUT CHART
──────────────────────────── */

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
        stroke="rgba(255,255,255,0.06)"
        strokeWidth={stroke}
      />

      {values.map((v, i) => {
        const fraction = total ? v.value / total : 0;
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
          />
        );
      })}

      <text
        x="50%"
        y="50%"
        textAnchor="middle"
        fontSize="16"
        fontWeight="800"
        fill="white"
      >
        ${total.toFixed(2)}
      </text>
    </svg>
  );
}

/* ─────────────────────────────
   PAGE
──────────────────────────── */

export default function SpendPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  /* form */
  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("misc");
  const [note, setNote] = useState("");

  /* OCR */
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [ocrText, setOcrText] = useState("");
  const [foundTxns, setFoundTxns] = useState<ParsedTxn[]>([]);
  const [selectedTxns, setSelectedTxns] = useState<Record<number, boolean>>({});

  /* ───────── LOAD USER + DATA ───────── */

  useEffect(() => {
    (async () => {
      const { data } = await supabase.auth.getSession();
      const user = data?.session?.user;

      if (!user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(user.id);

      const { data: rows } = await supabase
        .from("spend_entries")
        .select("*")
        .order("date_iso", { ascending: false });

      setEntries((rows || []) as SpendRow[]);
      setLoading(false);
    })();
  }, []);

  /* ───────── ADD SPEND ───────── */

  async function handleAddSpend() {
    if (!userId) return;

    const amt = Number(amount);
    if (!amt || amt <= 0) return;

    setSaving(true);

    await supabase.from("spend_entries").insert({
      user_id: userId,
      date_iso: dateISO,
      merchant: merchant || null,
      amount: amt,
      category,
      note: note || null,
    });

    setMerchant("");
    setAmount("");
    setCategory("misc");
    setNote("");

    const { data } = await supabase
      .from("spend_entries")
      .select("*")
      .order("date_iso", { ascending: false });

    setEntries((data || []) as SpendRow[]);
    setSaving(false);
  }

  /* ───────── DELETE ───────── */

  async function handleDelete(id: string) {
    await supabase.from("spend_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  /* ───────── OCR ───────── */

  async function handleOCR() {
    if (!imageFile) return;

    setOcrBusy(true);

    const { text } = await ocrImageFile(imageFile);
    setOcrText(text);

    const parsed = parseTransactionsScreenshot(text);
    setFoundTxns(parsed);

    const selected: Record<number, boolean> = {};
    parsed.forEach((t, i) => (selected[i] = t.direction === "debit"));
    setSelectedTxns(selected);

    setOcrBusy(false);
  }

  async function importSelected() {
    if (!userId) return;

    const spend = foundTxns
      .filter((_, i) => selectedTxns[i])
      .filter((t) => t.direction === "debit")
      .map((t) => ({
        user_id: userId,
        date_iso: todayISO(),
        merchant: t.merchant,
        amount: t.amount,
        category: guessCategoryFromMerchant(t.merchant),
        note: "Imported from OCR",
      }));

    if (spend.length) {
      await supabase.from("spend_entries").insert(spend);
    }

    setFoundTxns([]);
    setSelectedTxns({});
    setImageFile(null);

    const { data } = await supabase
      .from("spend_entries")
      .select("*")
      .order("date_iso", { ascending: false });

    setEntries((data || []) as SpendRow[]);
  }

  /* ───────── CALCULATIONS ───────── */

  const totals = useMemo(() => {
    const t: Record<SpendCategory, number> = {
      groceries: 0,
      gas: 0,
      eating_out: 0,
      bills: 0,
      kids: 0,
      business: 0,
      self_care: 0,
      subscriptions: 0,
      misc: 0,
    };

    entries.forEach((e) => {
      t[e.category] += Number(e.amount || 0);
    });

    return t;
  }, [entries]);

  const chart = Object.entries(totals).map(([k, v]) => ({
    label: CATEGORY_LABEL[k as SpendCategory],
    value: v,
  }));

  /* ───────── UI ───────── */

  return (
    <main className="min-h-screen bg-zinc-950 text-white px-4 py-6">
      <div className="mx-auto max-w-5xl space-y-8">
        <h1 className="text-3xl font-bold tracking-tight">Spend</h1>

        {message && <p className="text-red-400">{message}</p>}

        {/* FORM */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Add spending</h2>

          <div className="grid gap-3 md:grid-cols-4">
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Merchant"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpendCategory)}
              className="rounded-lg bg-zinc-800 px-3 py-2 text-sm"
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>

            <button
              onClick={handleAddSpend}
              disabled={saving}
              className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
            >
              Add
            </button>
          </div>
        </section>

        {/* OCR IMPORT */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-4">
          <h2 className="text-lg font-semibold">Import from screenshot</h2>

          <input
            type="file"
            accept="image/*"
            onChange={(e) => setImageFile(e.target.files?.[0] || null)}
            className="text-sm"
          />

          <button
            onClick={handleOCR}
            disabled={!imageFile || ocrBusy}
            className="rounded-lg bg-blue-600 px-3 py-2 text-sm font-semibold hover:bg-blue-500"
          >
            {ocrBusy ? "Processing…" : "Run OCR"}
          </button>

          {foundTxns.length > 0 && (
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-zinc-300">
                Found transactions
              </h3>

              {foundTxns.map((t, i) => (
                <label
                  key={i}
                  className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
                >
                  <div>
                    <div className="font-medium">{t.merchant}</div>
                    <div className="text-xs text-zinc-500">
                      ${t.amount.toFixed(2)}
                    </div>
                  </div>

                  <input
                    type="checkbox"
                    checked={selectedTxns[i]}
                    onChange={(e) =>
                      setSelectedTxns((prev) => ({
                        ...prev,
                        [i]: e.target.checked,
                      }))
                    }
                  />
                </label>
              ))}

              <button
                onClick={importSelected}
                className="rounded-lg bg-emerald-600 px-3 py-2 text-sm font-semibold hover:bg-emerald-500"
              >
                Import selected
              </button>
            </div>
          )}
        </section>

        {/* CHART + CATEGORY TOTALS */}
        <section className="grid gap-6 md:grid-cols-2">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 flex justify-center">
            <DonutChart values={chart} />
          </div>

          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-2">
            <h2 className="text-lg font-semibold">Totals by category</h2>
            {chart.map((c) => (
              <div
                key={c.label}
                className="flex items-center justify-between text-sm"
              >
                <span className="text-zinc-300">{c.label}</span>
                <span className="text-zinc-100">${c.value.toFixed(2)}</span>
              </div>
            ))}
          </div>
        </section>

        {/* LIST */}
        <section className="rounded-2xl border border-zinc-800 bg-zinc-900/70 p-4 space-y-3">
          <h2 className="text-lg font-semibold">Recent spend</h2>

          {entries.map((e) => (
            <div
              key={e.id}
              className="flex items-center justify-between rounded-lg border border-zinc-800 bg-zinc-950/60 px-3 py-2 text-sm"
            >
              <div>
                <div className="font-medium">{e.merchant}</div>
                <div className="text-xs text-zinc-500">
                  {CATEGORY_LABEL[e.category]}
                </div>
              </div>

              <div className="flex items-center gap-4">
                <span className="text-zinc-100">${e.amount.toFixed(2)}</span>
                <button
                  onClick={() => handleDelete(e.id)}
                  className="text-xs text-red-400 hover:text-red-300"
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </section>
      </div>
    </main>
  );
}
