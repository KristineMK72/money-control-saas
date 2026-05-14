"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
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

const shellClass =
  "rounded-[2rem] border border-white/25 bg-slate-950/45 p-4 shadow-2xl backdrop-blur-sm md:p-6";

const cardClass =
  "rounded-2xl border border-white/45 bg-white/80 p-5 shadow-xl backdrop-blur-md";

const inputClass =
  "w-full rounded-xl border border-zinc-300 bg-white/95 px-4 py-3 text-zinc-950 outline-none focus:border-emerald-500";

export default function IncomePage() {
  const supabase = useMemo(() => createSupabaseBrowserClient(), []);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [scanning, setScanning] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);
  const [openPanel, setOpenPanel] = useState<string | null>("add");

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

      setOpenPanel("add");
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

      setMessage("Income added.");
      setOpenPanel("entries");
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

  return (
    <main className="min-h-screen bg-transparent p-4 text-zinc-900 md:p-6">
      <div className={`${shellClass} mx-auto max-w-5xl space-y-5`}>
        <header className={cardClass}>
          <div className="text-xs font-black uppercase tracking-[0.25em] text-emerald-700">
            AskBen Income
          </div>

          <h1 className="mt-2 text-3xl font-black text-zinc-950 md:text-4xl">
            Income
          </h1>

          <p className="mt-2 max-w-2xl text-sm font-semibold text-zinc-700">
            Track money coming in without burying the whole page in forms.
          </p>

          <div className="mt-5 grid gap-3 md:grid-cols-3">
            <MiniStat label="Total Income" value={money(totalIncome)} />
            <MiniStat label="Sources" value={String(sources.length)} />
            <MiniStat label="Entries" value={String(entries.length)} />
          </div>

          {message && (
            <div className="mt-4 rounded-xl border border-amber-300 bg-amber-50/95 p-3 text-sm font-semibold text-amber-900">
              {message}
            </div>
          )}
        </header>

        <DropdownCard
          id="scanner"
          title="Scan income"
          value={scanning ? "Scanning..." : "Use camera/photo"}
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
        >
          <p className="text-sm font-semibold text-zinc-700">
            Upload a paycheck screenshot, deposit screenshot, or receipt-style
            income image. AskBen will try to fill in the source and amount.
          </p>

          <input
            type="file"
            accept="image/*"
            capture="environment"
            disabled={scanning}
            onChange={(e) => void scanIncomeImage(e.target.files?.[0] || null)}
            className="mt-4 block w-full rounded-xl border border-dashed border-emerald-300 bg-emerald-50/80 p-4 text-sm font-bold text-emerald-900"
          />
        </DropdownCard>

        <DropdownCard
          id="add"
          title="Add Income"
          value={sourceName || amount ? "Draft ready" : "Manual entry"}
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
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
              className="rounded-xl bg-emerald-600 px-4 py-3 font-black text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60"
            >
              {saving ? "Saving..." : "Add Income"}
            </button>
          </div>
        </DropdownCard>

        <DropdownCard
          id="entries"
          title="Income Entries"
          value={
            latestIncome
              ? `${latestIncome.source_name} · ${money(Number(latestIncome.amount || 0))}`
              : "No income yet"
          }
          openPanel={openPanel}
          setOpenPanel={setOpenPanel}
        >
          <div className="grid gap-3">
            {loading ? (
              <p className="text-sm font-semibold text-zinc-600">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm font-semibold text-zinc-600">
                No income yet.
              </p>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  className="flex flex-col gap-3 rounded-2xl border border-white/60 bg-white/85 p-4 shadow-sm md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <div className="text-base font-black text-zinc-950">
                      {e.source_name}
                    </div>

                    <div className="text-sm font-semibold text-zinc-600">
                      {e.date_iso}
                      {e.note ? ` · ${e.note}` : ""}
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
        </DropdownCard>
      </div>
    </main>
  );
}

function DropdownCard({
  id,
  title,
  value,
  openPanel,
  setOpenPanel,
  children,
}: {
  id: string;
  title: string;
  value: string;
  openPanel: string | null;
  setOpenPanel: (id: string | null) => void;
  children: React.ReactNode;
}) {
  const open = openPanel === id;

  return (
    <article className={cardClass}>
      <button
        type="button"
        onClick={() => setOpenPanel(open ? null : id)}
        className="w-full text-left"
      >
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="text-sm font-black uppercase tracking-wide text-zinc-700">
              {title}
            </h2>

            <p className="mt-1 text-2xl font-black text-zinc-950">{value}</p>
          </div>

          <span className="rounded-full bg-zinc-950 px-3 py-1 text-xs font-black text-white">
            {open ? "Hide" : "Open"}
          </span>
        </div>
      </button>

      {open && (
        <div className="mt-4 rounded-2xl border border-white/70 bg-white/82 p-4 backdrop-blur-md">
          {children}
        </div>
      )}
    </article>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-white/60 bg-white/75 p-4 shadow-sm backdrop-blur-sm">
      <div className="text-xs font-black uppercase tracking-wide text-zinc-600">
        {label}
      </div>
      <div className="mt-1 text-xl font-black text-zinc-950">{value}</div>
    </div>
  );
}
