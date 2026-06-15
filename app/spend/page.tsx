"use client";

import { useEffect, useMemo, useState } from "react";
import {
  AppShell,
  DarkPanel,
  MetricCard,
  Notice,
  PageHeader,
  Panel,
  inputClass,
  moneyButtonClass,
} from "@/components/AppFrame";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import { BenEngine } from "@/lib/ben/engine";
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
  payment_method: string | null;
  note: string | null;
  created_at: string;
};

type DebtOption = {
  id: string;
  name: string | null;
  kind: "credit" | "loan" | null;
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

const categoryLabel: Record<SpendCategory, string> = {
  groceries: "Groceries",
  gas: "Gas",
  eating_out: "Eating out",
  bills: "Bills",
  kids: "Kids",
  business: "Business",
  self_care: "Self care",
  subscriptions: "Subscriptions",
  misc: "Misc",
};

const basePaymentMethods = ["Debit", "Cash", "Checking", "Savings"];

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function SpendPage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SpendRow[]>([]);
  const [creditCards, setCreditCards] = useState<DebtOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const [dateISO, setDateISO] = useState(todayISO());
  const [merchant, setMerchant] = useState("");
  const [amount, setAmount] = useState("");
  const [category, setCategory] = useState<SpendCategory>("misc");
  const [paymentMethod, setPaymentMethod] = useState("Debit");
  const [note, setNote] = useState("");

  const [imageFile, setImageFile] = useState<File | null>(null);
  const [ocrBusy, setOcrBusy] = useState(false);
  const [foundTxns, setFoundTxns] = useState<ParsedTxn[]>([]);
  const [selectedTxns, setSelectedTxns] = useState<Record<number, boolean>>({});

  async function reloadRows(uid = userId) {
    if (!uid) return;

    const { data, error } = await supabase
      .from("spend_entries")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false });

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((data || []) as SpendRow[]);
  }

  async function reloadPaymentMethods(uid = userId) {
    if (!uid) return;

    const { data, error } = await supabase
      .from("debts")
      .select("id, name, kind")
      .eq("user_id", uid)
      .eq("kind", "credit")
      .order("name", { ascending: true });

    if (error) {
      console.error("Payment method load error:", error);
      return;
    }

    setCreditCards((data || []) as DebtOption[]);
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data.session?.user;
      if (!user) {
        setMessage("Sign in and Ben will stop guessing from the hallway.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await Promise.all([reloadRows(user.id), reloadPaymentMethods(user.id)]);
      setLoading(false);
    }

    void init();
  }, [supabase]);

  async function handleAddSpend() {
    setMessage("");

    if (!userId) {
      setMessage("Please sign in first.");
      return;
    }

    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Add a merchant and a real amount. Ben is witty, not psychic.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("spend_entries").insert({
      user_id: userId,
      date_iso: dateISO,
      merchant: merchant.trim(),
      amount: amt,
      category,
      payment_method: paymentMethod,
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
    setPaymentMethod("Debit");
    setNote("");
    setDateISO(todayISO());
    await reloadRows(userId);
    setMessage("Spending logged. The money trail has entered evidence.");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("spend_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    setMessage("Entry removed.");
  }

  async function handleOCR() {
    if (!imageFile) return;

    setOcrBusy(true);
    setMessage("Ben is reading the receipt with his serious spectacles on.");

    try {
      const result = await ocrImageFile(imageFile);
      const parsed = parseTransactionsScreenshot(result.text);

      setFoundTxns(parsed);
      setSelectedTxns(
        parsed.reduce<Record<number, boolean>>((acc, _txn, index) => {
          acc[index] = true;
          return acc;
        }, {})
      );

      setMessage(
        parsed.length
          ? `Found ${parsed.length} possible transactions. Review before importing.`
          : "No clear transactions found. You can still enter it manually."
      );
    } catch (error) {
      console.error("Spend OCR error:", error);
      setMessage("The scanner stumbled on that image. Try a clearer screenshot.");
    }

    setOcrBusy(false);
  }

  async function importSelected() {
    if (!userId) return;

    const rows = foundTxns
      .map((txn, index) => ({ txn, index }))
      .filter(({ index }) => selectedTxns[index])
      .map(({ txn }) => ({
        user_id: userId,
        date_iso:
          txn.dateText && /^\d{4}-\d{2}-\d{2}$/.test(txn.dateText)
            ? txn.dateText
            : dateISO,
        merchant: txn.merchant || "Imported transaction",
        amount: Number(txn.amount || 0),
        category: guessCategoryFromMerchant(txn.merchant || ""),
        payment_method: paymentMethod,
        note: `Imported from screenshot${paymentMethod ? ` • ${paymentMethod}` : ""}`,
      }))
      .filter((row) => Number.isFinite(row.amount) && row.amount > 0);

    if (rows.length === 0) {
      setMessage("Select at least one transaction with a valid amount.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("spend_entries").insert(rows);

    if (error) {
      setMessage(error.message);
      setSaving(false);
      return;
    }

    setFoundTxns([]);
    setSelectedTxns({});
    setImageFile(null);
    await reloadRows(userId);
    setMessage(`Imported ${rows.length} transactions. Ben filed the receipts.`);
    setSaving(false);
  }

  const paymentOptions = [
    ...basePaymentMethods,
    ...creditCards
      .map((card) => card.name?.trim())
      .filter((name): name is string => !!name),
  ];

  const totalSpend = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach((entry) => {
      const key = categoryLabel[entry.category] || "Misc";
      totals[key] = (totals[key] || 0) + Number(entry.amount || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  }, [entries]);

  const topPaymentMethod = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach((entry) => {
      const key = entry.payment_method || "Unknown";
      totals[key] = (totals[key] || 0) + Number(entry.amount || 0);
    });
    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0];
  }, [entries]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Spend",
    totalNeeded: totalSpend,
    incomeSoFar: 0,
    incomeGap: totalSpend,
    dailyIncomeNeeded: totalSpend > 0 ? Math.ceil(totalSpend / 30) : 0,
  });

  if (loading) {
    return (
      <AppShell max="max-w-5xl">
        <Panel>Loading spend controls...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell max="max-w-5xl">
      <PageHeader
        eyebrow="AskBen Spend"
        title="Spend"
        subtitle="Track every dollar leaving the building, including how thou paid for it."
      />

      {message && <Notice>{message}</Notice>}

      <DarkPanel>
        <BenBubble message={benInsight.text} mood={benInsight.mood} />
      </DarkPanel>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total spend" value={money(totalSpend)} tone="amber" />
        <MetricCard
          label="Top category"
          value={topCategory ? topCategory[0] : "None yet"}
          helper={topCategory ? money(topCategory[1]) : "No spend logged"}
          tone="sky"
        />
        <MetricCard
          label="Top payment"
          value={topPaymentMethod ? topPaymentMethod[0] : "None yet"}
          helper={topPaymentMethod ? money(topPaymentMethod[1]) : "No method logged"}
          tone="zinc"
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1fr_0.9fr]">
        <Panel>
          <h2 className="text-2xl font-black">Add Spending</h2>

          <div className="mt-5 grid gap-4 md:grid-cols-2">
            <input
              value={merchant}
              onChange={(e) => setMerchant(e.target.value)}
              placeholder="Merchant or place"
              className={inputClass}
            />

            <input
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              inputMode="decimal"
              className={inputClass}
            />

            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className={inputClass}
            />

            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as SpendCategory)}
              className={inputClass}
            >
              {categories.map((cat) => (
                <option key={cat} value={cat}>
                  {categoryLabel[cat]}
                </option>
              ))}
            </select>

            <select
              value={paymentMethod}
              onChange={(e) => setPaymentMethod(e.target.value)}
              className={inputClass}
            >
              {paymentOptions.map((method) => (
                <option key={method} value={method}>
                  {method}
                </option>
              ))}
            </select>

            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional note"
              className={`${inputClass} min-h-24 md:col-span-2`}
            />
          </div>

          <button
            onClick={handleAddSpend}
            disabled={saving || !userId}
            className={`${moneyButtonClass} mt-5 w-full`}
          >
            {saving ? "Saving..." : "Add Spend"}
          </button>
        </Panel>

        <PaperScrollScanner
          title="Scan Receipt"
          description="Upload a bank screenshot, receipt, or photo. Choose the payment method, then import."
          file={imageFile}
          busy={ocrBusy}
          onFileChange={(file) => {
            setImageFile(file);
            setFoundTxns([]);
            setSelectedTxns({});
            setMessage("");
          }}
          onScan={handleOCR}
        />
      </section>

      {foundTxns.length > 0 && (
        <Panel>
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div>
              <h2 className="text-2xl font-black">Review imports</h2>
              <p className="text-sm font-semibold text-zinc-600">
                Imported transactions will use payment method:{" "}
                <span className="font-black">{paymentMethod}</span>
              </p>
            </div>

            <button
              onClick={importSelected}
              disabled={saving}
              className={moneyButtonClass}
            >
              Import selected
            </button>
          </div>

          <div className="mt-5 grid gap-3">
            {foundTxns.map((txn, index) => (
              <label
                key={`${txn.merchant}-${index}`}
                className="flex items-center justify-between gap-4 rounded-2xl border border-zinc-200 bg-zinc-50 p-4"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={!!selectedTxns[index]}
                    onChange={(e) =>
                      setSelectedTxns((prev) => ({
                        ...prev,
                        [index]: e.target.checked,
                      }))
                    }
                  />

                  <div>
                    <p className="font-black">{txn.merchant || "Transaction"}</p>
                    <p className="text-sm font-semibold text-zinc-600">
                      {txn.dateText || dateISO} • {paymentMethod}
                    </p>
                  </div>
                </div>

                <p className="text-lg font-black">{money(Number(txn.amount || 0))}</p>
              </label>
            ))}
          </div>
        </Panel>
      )}

      <Panel>
        <h2 className="text-2xl font-black">Recent Spending</h2>

        <div className="mt-5 grid gap-3">
          {entries.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">
              No spending yet. Suspiciously peaceful.
            </p>
          ) : (
            entries.slice(0, 12).map((entry) => (
              <div
                key={entry.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-zinc-50 p-4 md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <p className="font-black">{entry.merchant || "Spending"}</p>
                  <p className="text-sm font-semibold text-zinc-600">
                    {entry.date_iso} • {categoryLabel[entry.category] || entry.category}
                    {entry.payment_method ? ` • ${entry.payment_method}` : ""}
                    {entry.note ? ` • ${entry.note}` : ""}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <p className="text-lg font-black">{money(Number(entry.amount || 0))}</p>

                  <button
                    onClick={() => void handleDelete(entry.id)}
                    className="rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-black text-rose-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Panel>
    </AppShell>
  );
}
