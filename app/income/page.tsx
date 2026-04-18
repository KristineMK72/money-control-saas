"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";
import { incomeNeedsEngine } from "@/lib/engines/incomeNeedsEngine";

type IncomeSourceRow = {
  id: string;
  name: string;
};

type IncomeEntryRow = {
  id: string;
  user_id: string;
  source_name: string;
  amount: number;
  date_iso: string;
  note: string | null;
  created_at: string;
};

function todayISO() {
  return new Date().toISOString().slice(0, 10);
}

export default function IncomePage() {
  const supabase = createSupabaseBrowserClient();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [userId, setUserId] = useState<string | null>(null);

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

    init();
  }, []);

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

    if (!userId) return setMessage("You need to be logged in.");

    const cleanSource = sourceName.trim();
    const amt = Number(amount);

    if (!cleanSource || !Number.isFinite(amt) || amt <= 0) {
      return setMessage("Enter a valid source and amount.");
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
    } catch (err: any) {
      setMessage(err.message || "Failed to add income.");
    }

    setSaving(false);
  }

  async function handleDelete(id: string) {
    const { error } = await supabase
      .from("income_entries")
      .delete()
      .eq("id", id)
      .eq("user_id", userId!);

    if (error) return setMessage(error.message);

    setEntries((prev) => prev.filter((e) => e.id !== id));
  }

  const totalIncome = useMemo(
    () => entries.reduce((sum, e) => sum + Number(e.amount || 0), 0),
    [entries]
  );

  const incomeThisMonth = useMemo(() => {
    const month = new Date().toISOString().slice(0, 7); // YYYY-MM
    return entries
      .filter((e) => e.date_iso.startsWith(month))
      .reduce((s, e) => s + Number(e.amount || 0), 0);
  }, [entries]);

  const avgIncome = useMemo(() => {
    if (entries.length === 0) return 0;
    return totalIncome / entries.length;
  }, [entries, totalIncome]);

  const needs = useMemo(() => {
    return incomeNeedsEngine({
      totalMonthlyBills: 0, // Dashboard handles bills; Income page focuses on income pacing
      incomeEntries: entries,
      todayISO: new Date().toISOString().slice(0, 10),
    });
  }, [entries]);

  return (
    <main className="min-h-screen bg-zinc-950 text-white">
      <section className="mx-auto max-w-4xl px-6 py-10 space-y-10">
        <header>
          <h1 className="text-3xl font-black tracking-tight">Income</h1>
          <p className="mt-2 text-sm text-white/60">
            Track all money coming in — and see what you need to stay on pace.
          </p>
        </header>

        {message && (
          <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-100">
            {message}
          </div>
        )}

        {/* BEN BUBBLE */}
        <div className="rounded-2xl border border-cyan-300/30 bg-cyan-400/10 px-4 py-3 text-sm text-cyan-100 max-w-md">
          <div className="text-xs uppercase tracking-[0.2em] text-cyan-200/80">
            Ben says
          </div>
          <p className="mt-1">{needs.benMessage}</p>
        </div>

        {/* STATS */}
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Total Income" value={totalIncome} />
          <Stat label="This Month" value={incomeThisMonth} />
          <Stat label="Avg per Entry" value={avgIncome} />
          <Stat label="Entries" value={entries.length} />
        </div>

        {/* NEEDS */}
        <div className="grid gap-4 md:grid-cols-4">
          <Stat label="Today's Need" value={needs.dailyNeed} />
          <Stat label="Weekly Need" value={needs.weeklyNeed} />
          <Stat label="Remaining Need" value={needs.remainingNeed} />
          <Stat label="Monthly Need" value={needs.monthlyNeed} />
        </div>

        {/* ADD INCOME */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold">Add Income</h2>

          <div className="mt-4 grid gap-3">
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
            />

            <input
              list="sources"
              placeholder="Source (Job, Tips, Side hustle)"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
            />

            <datalist id="sources">
              {sources.map((s) => (
                <option key={s.id} value={s.name} />
              ))}
            </datalist>

            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
            />

            <input
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border border-white/10 bg-zinc-900 px-4 py-3 text-white"
            />

            <button
              onClick={handleAddIncome}
              disabled={saving || !userId}
              className="rounded-xl bg-cyan-500 px-4 py-3 font-semibold text-zinc-900"
            >
              {saving ? "Saving..." : "Add Income"}
            </button>
          </div>
        </div>

        {/* ENTRIES */}
        <div className="rounded-3xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-lg font-bold">Income Entries</h2>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <p className="text-sm text-white/60">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-white/60">No income yet.</p>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-2xl border border-white/10 bg-zinc-900/40 p-4"
                >
                  <div>
                    <div className="font-semibold">{e.source_name}</div>
                    <div className="text-sm text-white/60">
                      {e.date_iso}
                      {e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      ${Number(e.amount).toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="rounded-lg border border-white/20 px-3 py-2 text-xs text-white/70"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </section>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
      <div className="text-xs uppercase tracking-[0.2em] text-white/50">
        {label}
      </div>
      <div className="mt-2 text-2xl font-bold">
        {typeof value === "number" ? `$${value.toFixed(2)}` : value}
      </div>
    </div>
  );
}
