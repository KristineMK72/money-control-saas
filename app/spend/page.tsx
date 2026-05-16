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

const categories: SpendCategory[] = ["groceries", "gas", "eating_out", "bills", "kids", "business", "self_care", "subscriptions", "misc"];

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

export default function SpendPage() {
  const supabase = createSupabaseBrowserClient();

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SpendRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  // Form states
  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("misc");
  const [note, setNote] = useState("");

  // OCR
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
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

  // ... (handleAddSpend, handleDelete, handleOCR, importSelected functions remain the same)
  // I'll keep them short for brevity — you can copy them from your current file

  async function handleAddSpend() { /* your existing logic */ }
  async function handleDelete(id: string) { /* your existing logic */ }
  async function handleOCR() { /* your existing logic */ }
  async function importSelected() { /* your existing logic */ }

  const totalSpend = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  return (
    <main className="min-h-screen px-4 py-8 text-white">
      <div className="mx-auto max-w-4xl space-y-8">
        <header className="space-y-3">
          <h1 className="text-6xl font-black tracking-tight drop-shadow-2xl">Spend</h1>
          <p className="max-w-2xl text-lg font-semibold text-white/85">
            Track every dollar leaving your kingdom.
          </p>
        </header>

        {message && (
          <div className="rounded-2xl border border-yellow-300/40 bg-yellow-950/70 p-4 text-yellow-100 backdrop-blur-xl">
            {message}
          </div>
        )}

        {/* === Add Manual Spend - Narrower & Cleaner === */}
        <section className="rounded-3xl border border-white/20 bg-black/50 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <h2 className="mb-6 text-2xl font-black">Add New Spending</h2>
          <div className="grid gap-4 md:grid-cols-2">
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Merchant / Where"
              className="w-full rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950 placeholder:text-zinc-500 focus:ring-2 focus:ring-yellow-400"
            />
            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              className="w-full rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950 placeholder:text-zinc-500 focus:ring-2 focus:ring-yellow-400"
            />
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="w-full rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950"
            />
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpendCategory)}
              className="w-full rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950"
            >
              {categories.map((c) => (
                <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>
              ))}
            </select>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note..."
              className="md:col-span-2 min-h-[100px] w-full rounded-2xl border border-white/40 bg-white/95 px-5 py-3.5 text-zinc-950 resize-y"
            />
          </div>
          <button
            onClick={handleAddSpend}
            disabled={saving}
            className="mt-6 w-full rounded-2xl bg-yellow-400 py-4 text-lg font-black text-zinc-950 shadow-xl hover:bg-yellow-300 transition"
          >
            {saving ? "Adding..." : "Add Spend"}
          </button>
        </section>

        {/* === Paper Scroll Image Upload - Enhanced === */}
        <section className="rounded-3xl border border-white/20 bg-black/50 p-6 md:p-8 shadow-2xl backdrop-blur-xl">
          <div className="flex items-start gap-4 mb-6">
            <div className="text-4xl">📜</div>
            <div>
              <h2 className="text-2xl font-black">Scan Receipt or Screenshot</h2>
              <p className="text-white/75">Ben can read photos, bank screenshots, and PDFs</p>
            </div>
          </div>

          <label className="block cursor-pointer rounded-3xl border border-dashed border-amber-400/50 bg-gradient-to-br from-amber-950/80 to-black/60 p-10 text-center hover:border-amber-400 transition-all">
            <input
              type="file"
              accept="image/*,.pdf"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setImageFile(file);
                setFoundTxns([]);
                setSelectedTxns({});
                setMessage("");
              }}
            />
            <div className="mx-auto mb-4 text-6xl">📜</div>
            <p className="text-xl font-black text-amber-100">
              {imageFile ? imageFile.name : "Tap to upload image or PDF"}
            </p>
            <p className="mt-2 text-sm text-amber-200/80">Screenshot • Receipt • Photo • PDF</p>
          </label>

          <button
            onClick={handleOCR}
            disabled={!imageFile || ocrBusy}
            className="mt-5 w-full rounded-2xl bg-emerald-500 py-4 text-lg font-black text-white shadow-xl hover:bg-emerald-400 transition disabled:opacity-50"
          >
            {ocrBusy ? "Ben is reading..." : "Scan with Ben"}
          </button>

          {/* Found transactions UI remains the same */}
          {foundTxns.length > 0 && (
            /* ... your existing transaction list ... */
            <div className="mt-8"> {/* your existing foundTxns UI */} </div>
          )}
        </section>

        {/* Rest of your page (charts, recent spending) */}
        {/* ... keep your DonutChart and Recent Spending sections ... */}
      </div>
    </main>
  );
}
