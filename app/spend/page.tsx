"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import BenBubble from "@/components/BenBubble";
import PaperScrollScanner from "@/components/PaperScrollScanner";
import { BenEngine } from "@/lib/ben/engine";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { todayISO } from "@/lib/money/utils";
import { money } from "@/lib/money/math";
import { awardXp } from "@/lib/xp/awardXp";
import type { SpendCategory } from "@/lib/money/types";
import {
  guessCategoryFromMerchant,
  ocrImageFile,
  parseTransactionsScreenshot,
  type ParsedTxn,
} from "@/lib/money/receiptOcr";

const SPEND_BG = "/60993E25-B30B-49BB-B61E-024554E45008.png";

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

type SpendNeed = {
  id: string;
  title: string;
  category: SpendCategory | null;
  estimated_amount: number | null;
  priority: string;
  status: string;
  due_date: string | null;
};

type LocalAlternative = {
  name: string;
  distanceMi: number;
  mapsUrl: string;
  priceLevel?: string;
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
  groceries: "🛒 Groceries",
  gas: "⛽ Gas",
  eating_out: "🍽️ Eating out",
  bills: "📋 Bills",
  kids: "👶 Kids",
  business: "💼 Business",
  self_care: "✨ Self care",
  subscriptions: "📱 Subscriptions",
  misc: "💰 Misc",
};

const basePaymentMethods = ["Debit", "Cash", "Checking", "Savings"];

type ActiveDrawer = "add" | "scan" | null;

export default function SpendPage() {
  const router = useRouter();
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [userId, setUserId] = useState<string | null>(null);
  const [entries, setEntries] = useState<SpendRow[]>([]);
  const [needs, setNeeds] = useState<SpendNeed[]>([]);
  const [creditCards, setCreditCards] = useState<DebtOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [showBenNotice, setShowBenNotice] = useState(false);
  const [drawer, setDrawer] = useState<ActiveDrawer>("add");

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
  const [needTitle, setNeedTitle] = useState("");
  const [needCategory, setNeedCategory] = useState<SpendCategory>("groceries");
  const [needEstimate, setNeedEstimate] = useState("");
  const [needDueDate, setNeedDueDate] = useState("");
  const [needPriority, setNeedPriority] = useState("normal");
  const [deals, setDeals] = useState<Record<string, LocalAlternative[]>>({});
  const [dealMessages, setDealMessages] = useState<Record<string, string>>({});
  const [dealsBusyKey, setDealsBusyKey] = useState<string | null>(null);
  const [scannedTip, setScannedTip] = useState<{ category: SpendCategory; merchant: string; amount: number } | null>(null);

  function showMsg(text: string) {
    setMessage(text);
    setTimeout(() => setMessage(""), 3500);
  }

  async function reloadRows(uid = userId) {
    if (!uid) return;

    const { data, error } = await supabase
      .from("spend_entries")
      .select("*")
      .eq("user_id", uid)
      .order("date_iso", { ascending: false });

    if (error) {
      showMsg(error.message);
      return;
    }

    setEntries(data || []);
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

    setCreditCards(data || []);
  }

  async function reloadNeeds(uid = userId) {
    if (!uid) return;
    const { data, error } = await supabase
      .from("spend_needs")
      .select("id, title, category, estimated_amount, priority, status, due_date")
      .eq("user_id", uid)
      .eq("status", "open")
      .order("due_date", { ascending: true, nullsFirst: false });
    if (error) {
      console.error("Spend needs load error:", error.message);
      return;
    }
    setNeeds(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data, error } = await supabase.auth.getSession();

      if (error) {
        showMsg(error.message);
        setLoading(false);
        return;
      }

      const user = data.session?.user;
      if (!user) {
        showMsg("Sign in and Ben will stop guessing from the hallway.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await Promise.all([reloadRows(user.id), reloadPaymentMethods(user.id), reloadNeeds(user.id)]);
      setLoading(false);
    }

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function handleAddSpend() {
    if (!userId) {
      showMsg("Please sign in first.");
      return;
    }

    const amt = Number(amount);
    if (!merchant.trim() || !Number.isFinite(amt) || amt <= 0) {
      showMsg("Add a merchant and a real amount.");
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
      showMsg(error.message);
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
    showMsg("Spending logged. The money trail has entered evidence.");
    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!userId) return;

    const ok = window.confirm("Delete this spend entry?");
    if (!ok) return;

    const { error } = await supabase
      .from("spend_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      showMsg(error.message);
      return;
    }

    setEntries((prev) => prev.filter((entry) => entry.id !== id));
    showMsg("Entry removed.");
  }

  async function handleAddNeed() {
    if (!userId || !needTitle.trim()) {
      showMsg("Add a title for the household need.");
      return;
    }
    const estimate = needEstimate ? Number(needEstimate) : null;
    if (estimate !== null && (!Number.isFinite(estimate) || estimate < 0)) {
      showMsg("Enter a valid estimate.");
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("spend_needs").insert({
      user_id: userId,
      title: needTitle.trim(),
      category: needCategory,
      estimated_amount: estimate,
      due_date: needDueDate || null,
      priority: needPriority,
    });
    if (error) showMsg(error.message);
    else {
      setNeedTitle(""); setNeedEstimate(""); setNeedDueDate(""); setNeedPriority("normal");
      await reloadNeeds(userId);
      showMsg("Need added to this week's market list.");
    }
    setSaving(false);
  }

  async function handleMarkBought(need: SpendNeed) {
    if (!userId) return;
    const amountText = window.prompt("Amount paid", need.estimated_amount?.toString() || "");
    if (amountText === null) return;
    const boughtAmount = Number(amountText);
    if (!Number.isFinite(boughtAmount) || boughtAmount <= 0) {
      showMsg("Enter the amount actually paid.");
      return;
    }
    const boughtMerchant = window.prompt("Merchant", "")?.trim();
    if (!boughtMerchant) return;

    setSaving(true);
    const { data: spend, error: spendError } = await supabase
      .from("spend_entries")
      .insert({
        user_id: userId,
        date_iso: todayISO(),
        merchant: boughtMerchant,
        amount: boughtAmount,
        category: need.category || "misc",
        payment_method: paymentMethod,
        note: `Fulfilled need: ${need.title}`,
      })
      .select("id")
      .single();
    if (spendError) {
      showMsg(spendError.message); setSaving(false); return;
    }
    const { error: needError } = await supabase
      .from("spend_needs")
      .update({ status: "done", fulfilled_spend_id: spend.id })
      .eq("id", need.id)
      .eq("user_id", userId);
    if (needError) {
      showMsg(needError.message); setSaving(false); return;
    }
    await awardXp({ amount: 12, reason: "Fulfilled a need", eventKey: `need:fulfilled:${need.id}` });
    await Promise.all([reloadRows(userId), reloadNeeds(userId)]);
    showMsg("Need fulfilled and recorded in the merchant ledger.");
    setSaving(false);
  }

async function findDeals(
  key: string,
  dealCategory: SpendCategory,
  dealMerchant?: string,
  dealAmount?: number,
  dealQuery?: string
) {
  if (!navigator.geolocation) {
    showMsg("Location is not available in this browser.");
    return;
  }
  setDealsBusyKey(key);
  navigator.geolocation.getCurrentPosition(
    async ({ coords }) => {
      try {
        const response = await fetch("/api/local-deals", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            lat: coords.latitude,
            lng: coords.longitude,
            category: dealCategory,
            merchant: dealMerchant,
            amount: dealAmount,
            query: dealQuery || dealMerchant || undefined,
          }),
        });
        const result = (await response.json()) as {
          alternatives?: LocalAlternative[];
          message?: string;
        };
        setDeals((current) => ({ ...current, [key]: result.alternatives || [] }));
        setDealMessages((current) => ({
          ...current,
          [key]: result.message || "Nearby options",
        }));
      } catch {
        setDealMessages((current) => ({
          ...current,
          [key]: "Nearby options are temporarily unavailable",
        }));
      } finally {
        setDealsBusyKey(null);
      }
    },
    () => {
      setDealsBusyKey(null);
      showMsg("Location permission is needed to find nearby options.");
    },
    { enableHighAccuracy: false, timeout: 10000 }
  );
}

  async function handleOCR() {
    if (!imageFile) return;

    setOcrBusy(true);
    showMsg("Ben is reading the receipt with his serious spectacles on.");

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

      showMsg(
        parsed.length
          ? `Found ${parsed.length} possible transactions. Review before importing.`
          : "No clear transactions found. You can still enter it manually."
      );
    } catch (err) {
      console.error("Spend OCR error:", err);
      showMsg("The scanner stumbled on that image. Try a clearer screenshot.");
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
      showMsg("Select at least one transaction with a valid amount.");
      return;
    }

    setSaving(true);

    const { error } = await supabase.from("spend_entries").insert(rows);

    if (error) {
      showMsg(error.message);
      setSaving(false);
      return;
    }

    setFoundTxns([]);
    setSelectedTxns({});
    setImageFile(null);

    const tipRow = rows.find((row) => ["groceries", "gas", "eating_out"].includes(row.category));
    setScannedTip(tipRow ? {
      category: tipRow.category,
      merchant: tipRow.merchant,
      amount: tipRow.amount,
    } : null);

    await reloadRows(userId);
    showMsg(`Imported ${rows.length} transactions. Ben filed the receipts.`);
    setSaving(false);
  }

  const paymentOptions = [
    ...basePaymentMethods,
    ...creditCards
      .map((card) => card.name?.trim())
      .filter((name): name is string => !!name),
  ];

  const totalSpend = entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);

  const thisMonthTotal = useMemo(() => {
    const now = new Date().toISOString().slice(0, 7);
    return entries
      .filter((e) => e.date_iso?.startsWith(now))
      .reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [entries]);

  const topCategory = useMemo(() => {
    const totals: Record<string, number> = {};
    entries.forEach((entry) => {
      const key = categoryLabel[entry.category]?.replace(/^[^\s]+ /, "") || "Misc";
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
      <div className="flex min-h-screen items-center justify-center bg-black">
        <p className="font-cinzel text-[#c9a84c]">
          Opening Franklin&apos;s Market Ledger…
        </p>
      </div>
    );
  }

  return (
    <main
      className="min-h-screen bg-black text-[#f5e6c8]"
      style={{ fontFamily: "EB Garamond, serif" }}
    >
      {/* ── Hero ── */}
      <section className="relative mx-auto max-w-5xl">
        <div
          className="px-4 py-3 text-center"
          style={{
            background:
              "linear-gradient(180deg, rgba(0,0,0,.98), rgba(15,8,4,.92))",
            borderBottom: "1px solid rgba(201,168,76,.25)",
          }}
        >
          <p className="font-cinzel text-xs uppercase tracking-[0.35em] text-[#c9a84c]">
            Franklin&apos;s Landing
          </p>
          <h1 className="font-cinzel text-2xl font-bold tracking-wide text-[#f5e6c8] sm:text-4xl">
            General Store of Spending
          </h1>
        </div>

        <img
          src={SPEND_BG}
          alt="General Store of Spending"
          className="block h-auto w-full"
          onError={(e) => {
            (e.target as HTMLImageElement).style.display = "none";
          }}
        />

        <button
          onClick={() => router.push("/world")}
          className="absolute left-4 top-20 rounded-full px-4 py-2 text-sm sm:top-24"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          ← Back to Town
        </button>

        <button
          onClick={() => setShowBenNotice(true)}
          className="absolute right-4 top-20 rounded-full px-4 py-2 text-sm sm:top-24"
          style={{
            background: "rgba(0,0,0,.72)",
            border: "1px solid rgba(201,168,76,.45)",
            color: "#f5e6c8",
          }}
        >
          Ben&apos;s Notice
        </button>
      </section>

      {/* ── Main content ── */}
      <section className="relative z-10 mx-auto -mt-2 max-w-5xl px-4 pb-24 sm:-mt-8">
        <div
          className="rounded-3xl p-4 sm:p-5"
          style={{
            background:
              "linear-gradient(180deg, rgba(8,5,3,.94), rgba(0,0,0,.99))",
            border: "1px solid rgba(201,168,76,.35)",
            boxShadow: "0 -30px 80px rgba(0,0,0,.9)",
          }}
        >
          {/* ── Notice banner ── */}
          {message && (
            <p className="mb-4 rounded-xl bg-[#c9a84c]/20 px-4 py-3 text-center text-[#f5e6c8]">
              {message}
            </p>
          )}

          {/* ── Top stats ── */}
          <div
            className="mb-5 grid grid-cols-2 overflow-hidden rounded-2xl sm:grid-cols-4"
            style={{
              border: "1px solid rgba(201,168,76,.4)",
              background: "rgba(0,0,0,.58)",
            }}
          >
            <Metric icon="🪙" label="Total Spend" value={money(totalSpend)} color="#ef4444" />
            <Metric icon="📅" label="This Month" value={money(thisMonthTotal)} color="#c9a84c" />
            <Metric
              icon="📊"
              label="Top Category"
              value={topCategory ? topCategory[0] : "None yet"}
              color="#c9a84c"
            />
            <Metric
              icon="💳"
              label="Top Method"
              value={topPaymentMethod ? topPaymentMethod[0] : "None yet"}
              color="#c9a84c"
            />
          </div>

          <Card
            title="Needs This Week"
            sub="Plan household purchases before they become surprise spending."
          >
            <div className="grid gap-3 rounded-xl p-3 sm:grid-cols-2" style={{ background: "rgba(0,0,0,.35)" }}>
              <Input label="Need" value={needTitle} onChange={setNeedTitle} placeholder="School supplies, groceries…" />
              <SelectInput
                label="Category"
                value={needCategory}
                onChange={(value) => setNeedCategory(value as SpendCategory)}
                options={categories.map((item) => ({ value: item, label: categoryLabel[item] }))}
              />
              <Input label="Estimate" value={needEstimate} onChange={setNeedEstimate} type="number" placeholder="0.00" />
              <Input label="Due" value={needDueDate} onChange={setNeedDueDate} type="date" />
              <SelectInput
                label="Priority"
                value={needPriority}
                onChange={setNeedPriority}
                options={["low", "normal", "high"].map((item) => ({ value: item, label: item[0].toUpperCase() + item.slice(1) }))}
              />
              <button
                type="button"
                onClick={() => void handleAddNeed()}
                disabled={saving || !userId}
                className="self-end rounded-xl bg-[#6b4423] py-2.5 font-bold disabled:opacity-50"
              >
                Add Need
              </button>
            </div>

            <div className="mt-4">
              <SelectInput
                label="Payment Method When Marking Bought"
                value={paymentMethod}
                onChange={setPaymentMethod}
                options={paymentOptions.map((method) => ({ value: method, label: method }))}
                highlight
              />
            </div>

            <div className="mt-4 grid gap-3">
              {needs.length === 0 ? (
                <p className="text-center text-[#9a7d5a]">No open needs on the market list.</p>
              ) : needs.map((need) => (
                <div key={need.id} className="rounded-xl p-4" style={{ background: "rgba(255,255,255,.04)", border: "1px solid rgba(201,168,76,.2)" }}>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#f5e6c8]">{need.title}</p>
                      <p className="text-sm text-[#9a7d5a]">
                        {need.category ? categoryLabel[need.category] || need.category : "Uncategorized"}
                        {need.estimated_amount !== null ? ` · est. ${money(Number(need.estimated_amount))}` : ""}
                        {need.due_date ? ` · due ${need.due_date}` : ""}
                        {` · ${need.priority} priority`}
                      </p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() =>
                            void findDeals(
                              need.id,
                              need.category || "misc",
                              undefined,
                              Number(need.estimated_amount || 0),
                              need.title
                            )
                          }
                        disabled={dealsBusyKey === need.id}
                        className="rounded-lg border border-[#c9a84c]/50 px-3 py-2 text-sm text-[#c9a84c] disabled:opacity-50"
                      >
                        {dealsBusyKey === need.id ? "Looking…" : "Find deals"}
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleMarkBought(need)}
                        disabled={saving}
                        className="rounded-lg bg-green-800 px-3 py-2 text-sm font-bold disabled:opacity-50"
                      >
                        Mark bought
                      </button>
                    </div>
                  </div>
                  {(dealMessages[need.id] || deals[need.id]) && (
                    <LocalAlternatives message={dealMessages[need.id]} alternatives={deals[need.id] || []} />
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* ── Ben's briefing ── */}
          <Card
            title="Ben's Spending Briefing"
            sub="Total spend, top category, and where your money is going."
          >
            <BenBubble message={benInsight.text} mood={benInsight.mood} />

            {(topCategory || topPaymentMethod) && (
              <div className="mt-4 grid grid-cols-2 gap-3">
                {topCategory && (
                  <StatTile
                    icon="📊"
                    label="Biggest Category"
                    value={topCategory[0]}
                    sub={money(topCategory[1])}
                  />
                )}
                {topPaymentMethod && (
                  <StatTile
                    icon="💳"
                    label="Most Used Method"
                    value={topPaymentMethod[0]}
                    sub={money(topPaymentMethod[1])}
                  />
                )}
              </div>
            )}
          </Card>

          {/* ── Drawer buttons ── */}
          <div className="my-5 grid grid-cols-2 gap-3">
            {(
              [
                { key: "add", label: "+ Add Spend" },
                { key: "scan", label: "📸 Scan Receipt" },
              ] as const
            ).map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setDrawer(drawer === key ? null : key)}
                className="rounded-xl py-4 font-cinzel text-base"
                style={{
                  background:
                    drawer === key
                      ? "linear-gradient(180deg, rgba(201,168,76,.42), rgba(70,40,10,.45))"
                      : "rgba(0,0,0,.45)",
                  border:
                    drawer === key
                      ? "1px solid rgba(251,191,36,.85)"
                      : "1px solid rgba(201,168,76,.35)",
                  color: drawer === key ? "#f5e6c8" : "#c9a84c",
                }}
              >
                {label}
              </button>
            ))}
          </div>

          {/* ── Add Spend drawer ── */}
          {drawer === "add" && (
            <DrawerPanel
              title="Record Spending"
              sub="Log every dollar leaving the household — and exactly how you paid."
            >
              <div className="grid gap-3 sm:grid-cols-2">
                <Input
                  label="Merchant / Place"
                  value={merchant}
                  onChange={setMerchant}
                  placeholder="Walmart, Shell, Amazon…"
                />
                <Input
                  label="Amount"
                  value={amount}
                  onChange={setAmount}
                  type="number"
                  placeholder="0.00"
                />
                <Input
                  label="Date"
                  value={dateISO}
                  onChange={setDateISO}
                  type="date"
                />
                <SelectInput
                  label="Category"
                  value={category}
                  onChange={(v) => setCategory(v as SpendCategory)}
                  options={categories.map((cat) => ({
                    value: cat,
                    label: categoryLabel[cat],
                  }))}
                />

                {/* Payment method — full-width, clearly labeled */}
                <div className="sm:col-span-2">
                  <SelectInput
                    label="Payment Method"
                    value={paymentMethod}
                    onChange={setPaymentMethod}
                    options={paymentOptions.map((method) => ({
                      value: method,
                      label: method,
                    }))}
                    highlight
                  />
                  <p className="mt-1 text-xs text-[#9a7d5a]">
                    Credit cards from your Debts ledger appear here automatically.
                  </p>
                </div>

                <div className="sm:col-span-2">
                  <label className="block">
                    <span className="text-xs uppercase tracking-widest text-[#c9a84c]">
                      Note (optional)
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      placeholder="Optional note"
                      rows={2}
                      className="mt-1 w-full rounded-lg px-3 py-2 text-black"
                      style={{ background: "#f5e6c8" }}
                    />
                  </label>
                </div>

                <button
                  onClick={() => void handleAddSpend()}
                  disabled={saving || !userId}
                  className="rounded-xl bg-green-800 py-3 font-bold disabled:opacity-50 sm:col-span-2"
                >
                  {saving ? "Saving…" : "💰 Save Spend"}
                </button>
              </div>
            </DrawerPanel>
          )}

          {/* ── Scan Receipt drawer ── */}
          {drawer === "scan" && (
            <DrawerPanel
              title="Scan Receipt"
              sub="Upload a bank screenshot, receipt, or photo. Choose the payment method, then import."
            >
              {/* Payment method selector shown prominently before scanning */}
              <div className="mb-4">
                <SelectInput
                  label="Payment Method for Import"
                  value={paymentMethod}
                  onChange={setPaymentMethod}
                  options={paymentOptions.map((method) => ({
                    value: method,
                    label: method,
                  }))}
                  highlight
                />
                <p className="mt-1 text-xs text-[#9a7d5a]">
                  All imported transactions will be tagged with this method.
                </p>
              </div>

              <PaperScrollScanner
                title="Scan Receipt"
                description="Ben will read every line. Review before importing."
                file={imageFile}
                busy={ocrBusy}
                onFileChange={(file) => {
                  setImageFile(file);
                  setFoundTxns([]);
                  setSelectedTxns({});
                }}
                onScan={() => void handleOCR()}
              />

              {/* Scanned results */}
              {foundTxns.length > 0 && (
                <div className="mt-5">
                  <div className="mb-3 flex items-center justify-between gap-3">
                    <div>
                      <h3 className="font-cinzel text-lg font-bold text-[#c9a84c]">
                        Review Imports
                      </h3>
                      <p className="text-sm text-[#b99b60]">
                        {foundTxns.length} transactions found · paying with{" "}
                        <span className="font-bold text-[#f5e6c8]">
                          {paymentMethod}
                        </span>
                      </p>
                    </div>
                    <button
                      onClick={() => void importSelected()}
                      disabled={saving}
                      className="rounded-xl bg-green-800 px-4 py-2 font-bold text-sm disabled:opacity-50"
                    >
                      {saving ? "Importing…" : "Import Selected"}
                    </button>
                  </div>

                  <div className="grid gap-2">
                    {foundTxns.map((txn, index) => (
                      <label
                        key={`${txn.merchant}-${index}`}
                        className="flex items-center justify-between gap-4 rounded-xl px-4 py-3 cursor-pointer"
                        style={{
                          background: selectedTxns[index]
                            ? "rgba(201,168,76,.1)"
                            : "rgba(255,255,255,.04)",
                          border: `1px solid ${selectedTxns[index] ? "rgba(201,168,76,.45)" : "rgba(201,168,76,.18)"}`,
                        }}
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
                            <p className="font-bold">
                              {txn.merchant || "Transaction"}
                            </p>
                            <p className="text-sm text-[#9a7d5a]">
                              {txn.dateText || dateISO} · {paymentMethod}
                            </p>
                          </div>
                        </div>
                        <p className="text-lg font-bold text-[#4ade80]">
                          {money(Number(txn.amount || 0))}
                        </p>
                      </label>
                    ))}
                  </div>
                </div>
              )}

              {scannedTip && (
                <div className="mt-5 rounded-xl p-4" style={{ background: "rgba(201,168,76,.1)", border: "1px solid rgba(201,168,76,.35)" }}>
                  <p className="font-cinzel font-bold text-[#c9a84c]">Ben&apos;s Local Tip</p>
                  <p className="mt-1 text-sm text-[#d6c09a]">Compare nearby options for future {categoryLabel[scannedTip.category].replace(/^[^\s]+ /, "").toLowerCase()} purchases. Availability and prices can vary.</p>
                  <button
                    type="button"
                    onClick={() => void findDeals("scanned-tip", scannedTip.category, scannedTip.merchant, scannedTip.amount)}
                    disabled={dealsBusyKey === "scanned-tip"}
                    className="mt-3 rounded-lg border border-[#c9a84c]/60 px-3 py-2 text-sm font-bold text-[#c9a84c] disabled:opacity-50"
                  >
                    {dealsBusyKey === "scanned-tip" ? "Looking…" : "Find nearby alternatives"}
                  </button>
                  {(dealMessages["scanned-tip"] || deals["scanned-tip"]) && (
                    <LocalAlternatives message={dealMessages["scanned-tip"]} alternatives={deals["scanned-tip"] || []} />
                  )}
                </div>
              )}
            </DrawerPanel>
          )}

          {/* ── Recent spending ── */}
          <Card
            title="Recent Spending"
            sub={`${entries.length} entries in the merchant ledger`}
          >
            <div className="mt-2 grid gap-2">
              {entries.length === 0 ? (
                <p className="text-center text-[#9a7d5a]">
                  No spending yet. Suspiciously peaceful.
                </p>
              ) : (
                entries.map((entry) => (
                  <div
                    key={entry.id}
                    className="flex items-center justify-between gap-3 rounded-xl px-4 py-3"
                    style={{
                      background: "rgba(255,255,255,.04)",
                      border: "1px solid rgba(201,168,76,.18)",
                    }}
                  >
                    <div>
                      <p className="font-bold">
                        {entry.merchant || "Spending"}
                      </p>
                      <p className="text-sm text-[#9a7d5a]">
                        {entry.date_iso}
                        {entry.category
                          ? ` · ${categoryLabel[entry.category]?.replace(/^[^\s]+ /, "") ?? entry.category}`
                          : ""}
                        {entry.payment_method ? ` · ${entry.payment_method}` : ""}
                        {entry.note ? ` · ${entry.note}` : ""}
                      </p>
                    </div>

                    <div className="flex items-center gap-3">
                      <p className="text-xl font-bold text-[#ef4444]">
                        {money(Number(entry.amount || 0))}
                      </p>
                      <button
                        onClick={() => void handleDelete(entry.id)}
                        className="rounded-xl px-3 py-2 text-sm font-bold"
                        style={{
                          background: "rgba(127,29,29,.35)",
                          border: "1px solid rgba(248,113,113,.45)",
                          color: "#fecaca",
                        }}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </Card>

          <p className="mt-6 text-center italic text-[#c9a84c]">
            &ldquo;Beware of little expenses; a small leak will sink a great ship.&rdquo; — Benjamin Franklin
          </p>
        </div>
      </section>

      {/* ── Ben's Notice modal ── */}
      {showBenNotice && (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/75 px-4">
          <div
            className="max-w-md rounded-3xl p-5"
            style={{
              background: "#fff7df",
              border: "2px solid #c9a84c",
              color: "#1a0f0a",
              boxShadow: "0 30px 80px rgba(0,0,0,.7)",
            }}
          >
            <div className="flex gap-3">
              <img
                src="/ben.png"
                alt="Ben"
                className="h-16 w-16 rounded-xl border border-[#c9a84c] object-cover"
              />
              <div>
                <p className="font-cinzel text-xs uppercase tracking-[0.25em] text-[#8a3a12]">
                  Ben&apos;s Almanack
                </p>
                <p className="mt-2 text-lg font-bold leading-snug">
                  {benInsight.text}
                </p>
                <p className="mt-3 text-sm">
                  You have {entries.length} spending entries logged. Top method:{" "}
                  {topPaymentMethod ? topPaymentMethod[0] : "none recorded yet"}.
                </p>
              </div>
            </div>
            <button
              onClick={() => setShowBenNotice(false)}
              className="mt-5 w-full rounded-xl py-3 font-bold"
              style={{ background: "#1a0f0a", color: "#f5e6c8" }}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </main>
  );
}

// ── Shared layout helpers ────────────────────────────────────────────

function Card({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-4 rounded-2xl p-4"
      style={{
        background: "rgba(15,8,4,.9)",
        border: "1px solid rgba(201,168,76,.35)",
      }}
    >
      <h2 className="font-cinzel text-xl font-bold text-[#c9a84c]">{title}</h2>
      {sub && <p className="mb-4 mt-1 text-sm text-[#b99b60]">{sub}</p>}
      <div className={sub ? "" : "mt-3"}>{children}</div>
    </div>
  );
}

function LocalAlternatives({ message, alternatives }: { message?: string; alternatives: LocalAlternative[] }) {
  return (
    <div className="mt-3 border-t border-[#c9a84c]/20 pt-3">
      <p className="text-sm italic text-[#d6c09a]">{message || "Nearby places that may be worth comparing"}</p>
      {alternatives.length > 0 && (
        <ul className="mt-2 grid gap-2 sm:grid-cols-2">
          {alternatives.map((alternative) => (
            <li key={`${alternative.name}-${alternative.distanceMi}`}>
              <a href={alternative.mapsUrl} target="_blank" rel="noreferrer" className="block rounded-lg bg-black/30 px-3 py-2 text-sm text-[#c9a84c] underline decoration-[#c9a84c]/40">
                {alternative.name} · {alternative.distanceMi.toFixed(1)} mi
                {alternative.priceLevel ? ` · ${alternative.priceLevel.replace("PRICE_LEVEL_", "").toLowerCase().replaceAll("_", " ")}` : ""}
              </a>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function DrawerPanel({
  title,
  sub,
  children,
}: {
  title: string;
  sub?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      className="mb-4 rounded-2xl p-4"
      style={{
        background: "rgba(15,8,4,.9)",
        border: "1px solid rgba(201,168,76,.35)",
      }}
    >
      <h3 className="font-cinzel text-xl font-bold text-[#c9a84c]">{title}</h3>
      {sub && <p className="mb-4 mt-1 text-sm text-[#b99b60]">{sub}</p>}
      <div className="mt-3">{children}</div>
    </div>
  );
}

function Metric({
  icon,
  label,
  value,
  color = "#c9a84c",
}: {
  icon: string;
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="border-b border-[#c9a84c]/20 p-4 text-center last:border-b-0 sm:border-b-0 sm:border-r sm:last:border-r-0">
      <div className="text-3xl">{icon}</div>
      <p className="mt-2 text-xs uppercase tracking-widest text-[#d6c09a]">
        {label}
      </p>
      <p className="mt-1 text-xl font-bold leading-tight" style={{ color }}>
        {value}
      </p>
    </div>
  );
}

function StatTile({
  icon,
  label,
  value,
  sub,
}: {
  icon: string;
  label: string;
  value: string;
  sub?: string;
}) {
  return (
    <div
      className="rounded-xl p-3 text-center"
      style={{
        background: "rgba(0,0,0,.45)",
        border: "1px solid rgba(201,168,76,.25)",
      }}
    >
      <p className="text-xl">{icon}</p>
      <p className="mt-1 text-xs uppercase tracking-wider text-[#d6c09a]">
        {label}
      </p>
      <p className="mt-1 font-bold text-[#c9a84c]">{value}</p>
      {sub && <p className="text-sm text-[#9a7d5a]">{sub}</p>}
    </div>
  );
}

function Input({
  label,
  value,
  onChange,
  type = "text",
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  placeholder?: string;
}) {
  return (
    <label className="block">
      <span className="text-xs uppercase tracking-widest text-[#c9a84c]">
        {label}
      </span>
      <input
        type={type}
        inputMode={type === "number" ? "decimal" : undefined}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full rounded-lg px-3 py-2 text-black"
        style={{ background: "#f5e6c8" }}
      />
    </label>
  );
}

function SelectInput({
  label,
  value,
  onChange,
  options,
  highlight = false,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
  highlight?: boolean;
}) {
  return (
    <label className="block">
      <span
        className="text-xs uppercase tracking-widest font-bold"
        style={{ color: highlight ? "#fbbf24" : "#c9a84c" }}
      >
        {label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="mt-1 w-full rounded-lg px-3 py-2 text-black font-bold"
        style={{
          background: highlight ? "#fff7df" : "#f5e6c8",
          border: highlight ? "2px solid #c9a84c" : undefined,
        }}
      >
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </label>
  );
}
