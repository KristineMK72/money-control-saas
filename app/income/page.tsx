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
import { clampMoney, money } from "@/lib/money/math";
import { todayISO } from "@/lib/money/utils";
import { currentMonthStartISO } from "@/lib/money/dates";

import type { IncomeSource, IncomeEntry } from "@/lib/money/types";

type ScanIncomeReview = {
  source_name: string;
  amount: string;
  date_iso: string;
  note: string;
};

export default function IncomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);

  const [sources, setSources] = useState<IncomeSource[]>([]);
  const [entries, setEntries] = useState<IncomeEntry[]>([]);
  const [scanReview, setScanReview] = useState<ScanIncomeReview[]>([]);

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

    setSources(sourcesRes.data || []);
    setEntries(entriesRes.data || []);
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

  async function scanIncomeImage(file: File | null) {
    if (!file) return;

    setScanning(true);
    setMessage("Scanning income image...");
    setScanReview([]);

    try {
      const ocrResult = await ocrImageFile(file);
      const parsed = parseTransactionsScreenshot(ocrResult.text);

      const incomeRows = parsed
        .filter((row) => clampMoney(row.amount) > 0)
        .map((row) => ({
          source_name: String(row.merchant || "Scanned Income").trim(),
          amount: String(clampMoney(row.amount)),
          date_iso:
            row.dateText && /^\d{4}-\d{2}-\d{2}$/.test(row.dateText)
              ? row.dateText
              : todayISO(),
          note: `Scanned from ${file.name}`,
        }));

      if (incomeRows.length === 0) {
        setMessage(
          "Scanner could not find income rows. You can still enter manually."
        );
        setScanning(false);
        return;
      }

      setScanReview(incomeRows);
      setImageFile(null);
      setMessage(
        `Ben found ${incomeRows.length} possible income deposits. Review before saving.`
      );
    } catch (error) {
      console.error("Income scanner error:", error);
      setMessage(
        "Scanner had trouble reading that image. Try another photo or enter it manually."
      );
    }

    setScanning(false);
  }

  async function saveScannedIncomeRows() {
    if (!userId || scanReview.length === 0) return;

    setSaving(true);
    setMessage("");

    try {
      for (const row of scanReview) {
        const source = row.source_name.trim() || "Scanned Income";
        const amt = clampMoney(row.amount);

        if (amt <= 0) continue;

        await ensureSourceExists(userId, source);

        const { error } = await supabase.from("income_entries").insert({
          user_id: userId,
          source_name: source,
          amount: amt,
          date_iso: row.date_iso || todayISO(),
          note: row.note || null,
        });

        if (error) throw new Error(error.message);
      }

      setScanReview([]);
      await loadData(userId);
      setMessage("Scanned income saved. The Treasury grows!");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Failed to save scanned income."
      );
    }

    setSaving(false);
  }

  async function handleAddIncome() {
    setMessage("");

    if (!userId) {
      setMessage("You need to be logged in.");
      return;
    }

    const cleanSource = sourceName.trim();
    const amt = clampMoney(amount);

    if (!cleanSource || amt <= 0) {
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

  const monthStart = currentMonthStartISO();

  const monthlyEntries = useMemo(() => {
    return entries.filter((entry) => entry.date_iso >= monthStart);
  }, [entries, monthStart]);

  const totalIncome = useMemo(() => {
    return entries.reduce((sum, e) => sum + clampMoney(e.amount), 0);
  }, [entries]);

  const monthlyIncome = useMemo(() => {
    return monthlyEntries.reduce((sum, e) => sum + clampMoney(e.amount), 0);
  }, [monthlyEntries]);

  // Last month comparison
  const lastMonthStart = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-01`;
  }, []);

  const lastMonthIncome = useMemo(() => {
    return entries
      .filter((entry) => entry.date_iso >= lastMonthStart && entry.date_iso < monthStart)
      .reduce((sum, e) => sum + clampMoney(e.amount), 0);
  }, [entries, lastMonthStart, monthStart]);

  const incomeChange = monthlyIncome - lastMonthIncome;
  const incomeChangePercent = lastMonthIncome > 0 
    ? Math.round((incomeChange / lastMonthIncome) * 100) 
    : null;

  const latestIncome = entries[0];

  const topSource = useMemo(() => {
    const totals: Record<string, number> = {};

    entries.forEach((entry) => {
      totals[entry.source_name] =
        (totals[entry.source_name] || 0) + clampMoney(entry.amount);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [entries]);

  const topMonthlySource = useMemo(() => {
    const totals: Record<string, number> = {};

    monthlyEntries.forEach((entry) => {
      totals[entry.source_name] =
        (totals[entry.source_name] || 0) + clampMoney(entry.amount);
    });

    return Object.entries(totals).sort((a, b) => b[1] - a[1])[0] || null;
  }, [monthlyEntries]);

  const scannedTotal = useMemo(() => {
    return scanReview.reduce((sum, row) => sum + clampMoney(row.amount), 0);
  }, [scanReview]);

  const benInsight = BenEngine.getForecastMessage({
    name: null,
    timeframeLabel: "Income",
    totalNeeded: 0,
    incomeSoFar: monthlyIncome,
    incomeGap: 0,
    dailyIncomeNeeded: 0,
  });

  const incomeMood =
    monthlyIncome > 0 ? "/ben-winning.png" : "/ben-thinking.png";

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

        <section className="mt-5 grid gap-4 md:grid-cols-4">
          <MetricCard
            label="This month"
            value={money(monthlyIncome)}
            tone="emerald"
            helper={
              incomeChangePercent !== null
                ? `${incomeChange >= 0 ? "↑" : "↓"} ${Math.abs(incomeChangePercent)}% vs last month`
                : ""
            }
          />

          <MetricCard
            label="All-time Total"
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

        {topMonthlySource && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Top Source This Month
            </p>
            <p className="mt-1 text-2xl font-black text-emerald-950">
              {topMonthlySource[0]}
            </p>
            <p className="text-sm font-bold text-emerald-800">
              {money(topMonthlySource[1])} recorded
            </p>
          </div>
        )}

        {!topMonthlySource && topSource && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
            <p className="text-xs font-black uppercase tracking-[0.18em] text-emerald-700">
              Top Source All-Time
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
        subtitle={
          scanning
            ? "Ben is reading the parchment..."
            : "Use camera, photo, or screenshot"
        }
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

        {scanReview.length > 0 && (
          <div className="mt-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-5 text-emerald-950">
            <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
              <div>
                <h3 className="text-xl font-black">Review Scanned Income</h3>
                <p className="mt-1 text-sm font-bold text-emerald-800">
                  {scanReview.length} row(s) found • Total {money(scannedTotal)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => setScanReview([])}
                disabled={saving}
                className="rounded-xl bg-white px-4 py-2 text-sm font-black text-emerald-950"
              >
                Clear Scan
              </button>
            </div>

            <div className="mt-4 grid gap-3">
              {scanReview.map((row, index) => (
                <div
                  key={`${row.source_name}-${index}`}
                  className="rounded-xl border border-emerald-200 bg-white p-3"
                >
                  <input
                    value={row.source_name}
                    placeholder="Source"
                    onChange={(e) => {
                      const next = [...scanReview];
                      next[index] = {
                        ...next[index],
                        source_name: e.target.value,
                      };
                      setScanReview(next);
                    }}
                    className={inputClass}
                  />

                  <input
                    value={row.amount}
                    placeholder="Amount"
                    inputMode="decimal"
                    onChange={(e) => {
                      const next = [...scanReview];
                      next[index] = {
                        ...next[index],
                        amount: e.target.value,
                      };
                      setScanReview(next);
                    }}
                    className={`${inputClass} mt-2`}
                  />

                  <input
                    type="date"
                    value={row.date_iso}
                    onChange={(e) => {
                      const next = [...scanReview];
                      next[index] = {
                        ...next[index],
                        date_iso: e.target.value,
                      };
                      setScanReview(next);
                    }}
                    className={`${inputClass} mt-2`}
                  />
                </div>
              ))}
            </div>

            <button
              onClick={() => void saveScannedIncomeRows()}
              disabled={saving}
              className={`${moneyButtonClass} mt-4 w-full`}
            >
              {saving ? "Saving..." : "Save All Scanned Income"}
            </button>
          </div>
        )}
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
            ? `${latestIncome.source_name} - ${money(latestIncome.amount)}`
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
                    {money(e.amount)}
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
