"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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
import ScrollRevealCard from "@/components/ScrollRevealCard";
import { BenEngine } from "@/lib/ben/engine";
import {
  ocrImageFile,
  parseTransactionsScreenshot,
} from "@/lib/money/receiptOcr";

type IncomeSourceRow = {
  id: string;
  name: string;
};

type IncomeEntryRow = {
  id: string;
  source_name: string;
  amount: number;
  date_iso: string;
  note: string | null;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

function money(n: number) {
  return n.toLocaleString("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 2,
  });
}

export default function IncomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [sources, setSources] = useState<IncomeSourceRow[]>([]);
  const [entries, setEntries] = useState<IncomeEntryRow[]>([]);

  const [dateISO, setDateISO] = useState(todayISO());
  const [sourceName, setSourceName] = useState("");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");

  async function loadData(uid: string) {
    const [sourcesRes, entriesRes] = await Promise.all([
      supabase
        .from("income_sources")
        .select("*")
        .eq("user_id", uid)
        .order("name", { ascending: true }),

      supabase
        .from("income_entries")
        .select("*")
        .eq("user_id", uid)
        .order("date_iso", { ascending: false }),
    ]);

    if (sourcesRes.error) setMessage(sourcesRes.error.message);
    if (entriesRes.error) setMessage(entriesRes.error.message);

    setSources((sourcesRes.data || []) as IncomeSourceRow[]);
    setEntries((entriesRes.data || []) as IncomeEntryRow[]);
  }

  useEffect(() => {
    async function init() {
      setLoading(true);

      const { data, error } = await supabase.auth.getUser();

      if (error) {
        setMessage(error.message);
        setLoading(false);
        return;
      }

      const user = data?.user;

      if (!user) {
        setMessage("Please log in first.");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      await loadData(user.id);
      setLoading(false);
    }

    void init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [supabase]);

  async function scanIncomeImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("Scanning income image...");

    try {
      const ocrResult = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(ocrResult.text);
      const first = parsed?.[0];

      if (!first) {
        setMessage(
          "Scanner could not find an income amount. You can still enter it manually."
        );
        setScanning(false);
        return;
      }

      const merchant = String(first.merchant || "").trim();
      const parsedAmount = Number(first.amount || 0);

      if (merchant) setSourceName(merchant);

      if (Number.isFinite(parsedAmount) && parsedAmount > 0) {
        setAmount(String(parsedAmount));
      }

      setImageFile(null);
      setMessage("Scanner filled what it could. Check it, then tap Add Income.");
    } catch (error) {
      console.error("Income scanner error:", error);
      setMessage(
        "Scanner had trouble reading that image. Try another photo or enter it manually."
      );
    }

    setScanning(false);
  }

  async function ensureSourceExists(uid: string, name: string) {
    const clean = name.trim();
    if (!clean) return;

    const exists = sources.some(
      (s) => s.name.toLowerCase() === clean.toLowerCase()
    );

    if (exists) return;

    const { error } = await supabase.from("income_sources").insert({
      user_id: uid,
      name: clean,
    });

    if (error) throw new Error(error.message);
  }

  async function handleAddIncome() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const cleanSource = sourceName.trim();
    const amt = Number(amount);

    if (!cleanSource || !Number.isFinite(amt) || amt <= 0) {
      setMessage("Enter a valid source and amount.");
      return;
    }

    setSaving(true);

    try {
      await ensureSourceExists(userId, cleanSource);

      const { error } = await supabase.from("income_entries").insert({
        user_id: userId,
        source_name: cleanSource,
        amount: amt,
        date_iso: dateISO,
        note: note.trim() || null,
      });

      if (error) {
        setMessage(error.message);
        setSaving(false);
        return;
      }

      setSourceName("");
      setAmount("");
      setNote("");
      setDateISO(todayISO());

      await loadData(userId);

      setMessage("Income added. The Treasury notes a fresh deposit.");
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "Failed to add income.");
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    if (!userId) return;

    const { error } = await supabase
      .from("income_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (error) {
      setMessage(error.message);
      return;
    }

    setEntries((prev) => prev.filter((e) => e.id !== id));
    setMessage("Income deleted.");
  }

  const totalIncome = useMemo(() => {
    return entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [entries]);

  const latestIncome = entries[0];

  const topSource = useMemo(() => {
    const totals: Record<string, number> = {};

    entries.forEach((entry) => {
      totals[entry.source_name] =
        (totals[entry.source_name] || 0) + Number(entry.amount || 0);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [entries]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income",
    totalNeeded: 0,
    incomeSoFar: totalIncome,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  const incomeMood = totalIncome > 0 ? "/ben-winning.png" : "/ben-thinking.png";

  if (loading) {
    return (
      <AppShell max="max-w-5xl">
        <Panel>Loading income ledger...</Panel>
      </AppShell>
    );
  }

  return (
    <AppShell max="max-w-5xl">
      <PageHeader
        eyebrow="AskBen Income"
        title="Income"
        subtitle="Track money coming in without burying the whole page in forms."
      />

      {message && <Notice>{message}</Notice>}

      <ScrollRevealCard
        title="Treasury Income Briefing"
        subtitle="Income totals, sources, and Ben's read on the ledger"
        image={incomeMood}
        defaultOpen
      >
        <DarkPanel>
          <BenBubble message={benInsight.text} mood={benInsight.mood} />
        </DarkPanel>

        <section className="mt-5 grid gap-4 md:grid-cols-3">
          <MetricCard
            label="Total income"
            value={money(totalIncome)}
            tone="emerald"
          />

          <MetricCard label="Sources" value={String(sources.length)} tone="sky" />

          <MetricCard
            label="Entries"
            value={String(entries.length)}
            helper={latestIncome ? latestIncome.source_name : "No income yet"}
            tone="zinc"
          />
        </section>

        {topSource && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Top Source
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-950">
              {topSource[0]}
            </p>
            <p className="text-sm font-bold text-emerald-800">
              {money(topSource[1])} recorded
            </p>
          </div>
        )}
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Scan Income"
        subtitle={scanning ? "Ben is reading the parchment..." : "Use camera, photo, or screenshot"}
        image="/ben-mastermind.png"
      >
        <PaperScrollScanner
          title="Scan Income"
          description="Upload a paycheck, deposit screenshot, or income proof. Ben will attempt the source and amount for thy review."
          file={imageFile}
          busy={scanning}
          onFileChange={setImageFile}
          onScan={() => void scanIncomeImage(imageFile)}
        />
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Add Income"
        subtitle={sourceName || amount ? "Draft ready for review" : "Manual entry"}
        image="/ben-thinking.png"
        defaultOpen
      >
        <div className="grid gap-3">
          <input
            type="date"
            value={dateISO}
            onChange={(e) => setDateISO(e.target.value)}
            className={inputClass}
          />

          <input
            list="sources"
            placeholder="Source: Job, Tips, Side hustle..."
            value={sourceName}
            onChange={(e) => setSourceName(e.target.value)}
            className={inputClass}
          />

          <datalist id="sources">
            {sources.map((s) => (
              <option key={s.id} value={s.name} />
            ))}
          </datalist>

          <input
            type="number"
            inputMode="decimal"
            placeholder="Amount"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className={inputClass}
          />

          <input
            placeholder="Note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            className={inputClass}
          />

          <button
            onClick={handleAddIncome}
            disabled={saving || !userId}
            className={moneyButtonClass}
          >
            {saving ? "Saving..." : "Add Income"}
          </button>
        </div>
      </ScrollRevealCard>

      <ScrollRevealCard
        title="Income Entries"
        subtitle={
          latestIncome
            ? `${latestIncome.source_name} - ${money(Number(latestIncome.amount || 0))}`
            : "No income yet"
        }
        image="/ben-recovery.png"
        defaultOpen
      >
        <div className="grid gap-3">
          {entries.length === 0 ? (
            <p className="text-sm font-semibold text-zinc-600">No income yet.</p>
          ) : (
            entries.map((e) => (
              <div
                key={e.id}
                className="flex flex-col gap-3 rounded-2xl border border-zinc-200 bg-white p-4 shadow-sm md:flex-row md:items-center md:justify-between"
              >
                <div>
                  <div className="text-base font-black text-zinc-950">
                    {e.source_name}
                  </div>

                  <div className="text-sm font-semibold text-zinc-600">
                    {e.date_iso}
                    {e.note ? ` - ${e.note}` : ""}
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-lg font-black text-emerald-800">
                    {money(Number(e.amount || 0))}
                  </div>

                  <button
                    onClick={() => void handleDelete(e.id)}
                    className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-xs font-black text-red-700"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollRevealCard>
    </AppShell>
  );
}
