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

const page = {
  shell: "min-h-screen px-4 py-8 text-white font-serif",
  wrap: "mx-auto max-w-5xl space-y-6",
  glass:
    "rounded-3xl border border-white/20 bg-black/50 p-5 shadow-2xl backdrop-blur-xl",
  input:
    "w-full rounded-2xl border border-white/40 bg-white/95 px-4 py-3 text-zinc-950 placeholder:text-zinc-500 shadow-lg outline-none focus:ring-4 focus:ring-yellow-400/50",
  button:
    "w-full rounded-2xl px-5 py-3 text-lg font-black shadow-xl transition disabled:opacity-50",
};

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

function DonutChart({
  values,
  size = 210,
  stroke = 24,
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
    <div className="flex justify-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="rgba(255,255,255,0.18)"
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
          y="47%"
          textAnchor="middle"
          fontSize="16"
          fontWeight="900"
          fill="white"
        >
          Total
        </text>

        <text
          x="50%"
          y="58%"
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fill="white"
        >
          {money(total)}
        </text>
      </svg>
    </div>
  );
}

export default function SpendPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [message, setMessage] = useState("");

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

  async function reloadRows() {
    const { data } = await supabase
      .from("spend_entries")
      .select("*")
      .order("date_iso", { ascending: false });

    setEntries((data || []) as SpendRow[]);
  }

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
      await reloadRows();
      setLoading(false);
    })();
  }, []);

  async function handleAddSpend() {
    if (!userId) return;

    const amt = Number(amount);
    if (!merchant.trim()) {
      setMessage("Add a merchant first.");
      return;
    }

    if (!amt || amt <= 0) {
      setMessage("Add a valid amount.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error } = await supabase.from("spend_entries").insert({
      user_id: userId,
      date_iso: dateISO,
      merchant: merchant.trim(),
      amount: amt,
      category,
      note: note.trim() || null,
    });

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setMerchant("");
    setAmount("");
    setCategory("misc");
    setNote("");
    setDateISO(todayISO());

    await reloadRows();
    setSaving(false);
  }

  async function handleDelete(id: string) {
    await supabase.from("spend_entries").delete().eq("id", id);
    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  async function handleOCR() {
    if (!imageFile) return;

    setOcrBusy(true);
    setMessage("");
    setFoundTxns([]);
    setSelectedTxns({});

    try {
      const { text } = await ocrImageFile(imageFile);
      setOcrText(text);

      const parsed = parseTransactionsScreenshot(text);
      setFoundTxns(parsed);

      const selected: Record<number, boolean> = {};
      parsed.forEach((t, i) => {
        selected[i] = t.direction === "debit";
      });

      setSelectedTxns(selected);

      if (!parsed.length) {
        setMessage("Ben couldn't find transactions in that file.");
      }
    } catch (err: any) {
      setMessage(err?.message || "OCR failed.");
    }

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

    if (!spend.length) {
      setMessage("No transactions selected.");
      return;
    }

    const { error } = await supabase.from("spend_entries").insert(spend);

    if (error) {
      setMessage(error.message);
      return;
    }

    setFoundTxns([]);
    setSelectedTxns({});
    setImageFile(null);
    setOcrText("");

    await reloadRows();
  }

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

  const totalSpend = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <main className={page.shell}>
      <div className={page.wrap}>
        <header className="space-y-2">
          <h1 className="text-6xl font-black tracking-tight drop-shadow-2xl">
            Spend
          </h1>
          <p className="max-w-2xl text-lg font-semibold text-white/85 drop-shadow-xl">
            Track every dollar leaving your kingdom. Receipts, screenshots,
            photos, and files are welcome.
          </p>
        </header>

        {message && (
          <div className="rounded-2xl border border-yellow-300/40 bg-yellow-950/50 p-4 text-yellow-100 shadow-xl backdrop-blur-xl">
            {message}
          </div>
        )}

        <section className={page.glass}>
          <h2 className="mb-4 text-2xl font-black">Add Spending</h2>

          <div className="grid gap-3">
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Merchant"
              className={page.input}
            />

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              className={page.input}
            />

            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className={page.input}
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpendCategory)}
              className={page.input}
            >
              {categories.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABEL[c]}
                </option>
              ))}
            </select>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Note, if Ben deserves context..."
              className={`${page.input} min-h-24`}
            />

            <button
              onClick={handleAddSpend}
              disabled={saving}
              className={`${page.button} bg-yellow-400 text-zinc-950`}
            >
              {saving ? "Adding..." : "Add Spend"}
            </button>
          </div>
        </section>

        <section className={page.glass}>
          <div className="flex items-start gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl border border-white/20 bg-yellow-400/15 text-3xl shadow-xl">
              📎
            </div>

            <div>
              <h2 className="text-2xl font-black">Scan Spend</h2>
              <p className="mt-1 text-sm font-semibold text-white/75">
                Upload a receipt, bank screenshot, photo, PNG, JPG, WEBP, or PDF.
              </p>
            </div>
          </div>

          <label className="mt-5 block cursor-pointer rounded-3xl border border-dashed border-white/35 bg-black/35 p-8 text-center shadow-inner backdrop-blur-xl">
            <input
              type="file"
              accept="image/*,.pdf,application/pdf"
              className="hidden"
              onChange={(e) => {
                setImageFile(e.target.files?.[0] ?? null);
                setOcrText("");
                setFoundTxns([]);
                setSelectedTxns({});
                setMessage("");
              }}
            />

            <div className="text-5xl">📜</div>

            <p className="mt-3 text-xl font-black">
              {imageFile ? imageFile.name : "Tap to upload"}
            </p>

            <p className="mt-1 text-sm font-semibold text-white/60">
              Screenshot • Photo • File • JPG • PNG • WEBP • PDF
            </p>
          </label>

          <button
            onClick={handleOCR}
            disabled={!imageFile || ocrBusy}
            className={`${page.button} mt-4 bg-emerald-400 text-zinc-950`}
          >
            {ocrBusy ? "Ben is reading it..." : "Scan with Ben"}
          </button>

          {foundTxns.length > 0 && (
            <div className="mt-6 space-y-3">
              <h3 className="text-xl font-black">Found Transactions</h3>

              {foundTxns.map((t, i) => (
                <label
                  key={`${t.merchant}-${t.amount}-${i}`}
                  className="flex items-center justify-between gap-3 rounded-2xl border border-white/15 bg-black/45 p-4 shadow-lg"
                >
                  <div>
                    <p className="text-lg font-black">{t.merchant}</p>
                    <p className="text-sm font-semibold text-white/70">
                      {money(t.amount)} • {t.direction}
                    </p>
                  </div>

                  <input
                    type="checkbox"
                    checked={!!selectedTxns[i]}
                    onChange={(e) =>
                      setSelectedTxns((prev) => ({
                        ...prev,
                        [i]: e.target.checked,
                      }))
                    }
                    className="h-6 w-6 accent-yellow-400"
                  />
                </label>
              ))}

              <button
                onClick={importSelected}
                className={`${page.button} bg-yellow-400 text-zinc-950`}
              >
                Import Selected
              </button>
            </div>
          )}

          {ocrText && foundTxns.length === 0 && (
            <details className="mt-4 rounded-2xl border border-white/15 bg-black/35 p-4">
              <summary className="cursor-pointer font-bold">
                Show raw scan text
              </summary>
              <pre className="mt-3 max-h-64 overflow-auto whitespace-pre-wrap text-xs text-white/75">
                {ocrText}
              </pre>
            </details>
          )}
        </section>

        <section className={page.glass}>
          <div className="grid gap-4 md:grid-cols-2">
            <div>
              <p className="text-sm font-black uppercase tracking-[0.2em] text-white/60">
                Total Spend
              </p>
              <p className="mt-1 text-5xl font-black">
                {money(totalSpend)}
              </p>
            </div>

            <DonutChart values={chart} />
          </div>
        </section>

        <section className={page.glass}>
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-2xl font-black">Recent Spending</h2>
            <span className="rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm font-bold">
              {entries.length} entries
            </span>
          </div>

          {loading ? (
            <p className="text-white/75">Loading spending...</p>
          ) : entries.length === 0 ? (
            <p className="text-white/75">
              No spending yet. Add one manually or scan a receipt.
            </p>
          ) : (
            <div className="space-y-3">
              {entries.map((e) => (
                <div
                  key={e.id}
                  className="grid grid-cols-[1fr_auto_auto] items-center gap-3 rounded-2xl border border-white/15 bg-black/45 p-4 shadow-lg"
                >
                  <div className="min-w-0">
                    <p className="truncate text-xl font-black">
                      {e.merchant || "Unknown Merchant"}
                    </p>
                    <p className="text-sm font-semibold text-white/65">
                      {CATEGORY_LABEL[e.category]} • {e.date_iso}
                    </p>
                    {e.note && (
                      <p className="mt-1 text-sm text-white/60">{e.note}</p>
                    )}
                  </div>

                  <p className="text-xl font-black">{money(e.amount)}</p>

                  <button
                    onClick={() => handleDelete(e.id)}
                    className="rounded-xl border border-white/20 bg-white/10 px-3 py-2 font-black text-white"
                    aria-label={`Delete ${e.merchant || "spend entry"}`}
                  >
                    X
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
