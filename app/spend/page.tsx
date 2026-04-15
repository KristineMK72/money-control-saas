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
   SINGLE SOURCE OF TRUTH
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
        stroke="rgba(0,0,0,0.08)"
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
        fill="currentColor"
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
    <main className="p-6 max-w-5xl mx-auto">
      <h1 className="text-3xl font-bold">Spend</h1>

      {message && <p className="text-red-500">{message}</p>}

      {/* FORM */}
      <div className="grid gap-2 mt-6">
        <input value={merchant} onChange={(e) => setMerchant(e.target.value)} placeholder="Merchant" />
        <input value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="Amount" />
        <select value={category} onChange={(e) => setCategory(e.target.value as SpendCategory)}>
          {categories.map((c) => (
            <option key={c} value={c}>
              {CATEGORY_LABEL[c]}
            </option>
          ))}
        </select>

        <button onClick={handleAddSpend} disabled={saving}>
          Add
        </button>
      </div>

      {/* CHART */}
      <div className="mt-10">
        <DonutChart values={chart} />
      </div>

      {/* LIST */}
      <div className="mt-10">
        {entries.map((e) => (
          <div key={e.id} className="flex justify-between border p-2">
            <div>
              {e.merchant} — {CATEGORY_LABEL[e.category]}
            </div>
            <div>${e.amount}</div>
            <button onClick={() => handleDelete(e.id)}>X</button>
          </div>
        ))}
      </div>
    </main>
  );
}
