"use client";

import { useEffect, useMemo, useState } from "react";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

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

  const totalIncome = useMemo(() => {
    return entries.reduce((sum, e) => sum + Number(e.amount || 0), 0);
  }, [entries]);

  return (
    <main className="min-h-screen bg-zinc-50 text-zinc-900">
      <div className="mx-auto max-w-4xl px-6 py-10">

        <div>
          <h1 className="text-3xl font-black">Income</h1>
          <p className="mt-2 text-zinc-600">
            Track all money coming in.
          </p>
        </div>

        {message ? (
          <div className="mt-4 rounded-xl border bg-white p-4 text-sm text-zinc-600">
            {message}
          </div>
        ) : null}

        <div className="mt-8 grid gap-4 md:grid-cols-3">
          <Stat label="Total Income" value={totalIncome} />
          <Stat label="Sources" value={sources.length} />
          <Stat label="Entries" value={entries.length} />
        </div>

        {/* ADD INCOME */}
        <div className="mt-8 rounded-3xl border bg-white p-6">
          <h2 className="text-lg font-bold">Add Income</h2>

          <div className="mt-4 grid gap-3">
            <input
              type="date"
              value={dateISO}
              onChange={(e) => setDateISO(e.target.value)}
              className="rounded-xl border px-4 py-3"
            />

            <input
              list="sources"
              placeholder="Source (Job, Tips, Side hustle)"
              value={sourceName}
              onChange={(e) => setSourceName(e.target.value)}
              className="rounded-xl border px-4 py-3"
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
              className="rounded-xl border px-4 py-3"
            />

            <input
              placeholder="Note"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-xl border px-4 py-3"
            />

            <button
              onClick={handleAddIncome}
              disabled={saving || !userId}
              className="rounded-xl bg-zinc-900 px-4 py-3 font-semibold text-white"
            >
              {saving ? "Saving..." : "Add Income"}
            </button>
          </div>
        </div>

        {/* ENTRIES */}
        <div className="mt-8 rounded-3xl border bg-white p-6">
          <h2 className="text-lg font-bold">Income Entries</h2>

          <div className="mt-4 grid gap-3">
            {loading ? (
              <p className="text-sm text-zinc-500">Loading...</p>
            ) : entries.length === 0 ? (
              <p className="text-sm text-zinc-500">No income yet.</p>
            ) : (
              entries.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center justify-between rounded-2xl bg-zinc-50 p-4"
                >
                  <div>
                    <div className="font-semibold">{e.source_name}</div>
                    <div className="text-sm text-zinc-500">
                      {e.date_iso}{e.note ? ` · ${e.note}` : ""}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="font-semibold">
                      ${Number(e.amount).toFixed(2)}
                    </div>
                    <button
                      onClick={() => handleDelete(e.id)}
                      className="rounded-lg border px-3 py-2 text-xs"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl border bg-white p-5">
      <div className="text-sm text-zinc-500">{label}</div>
      <div className="mt-2 text-3xl font-black">
        {typeof value === "number" ? value.toFixed(0) : value}
      </div>
    </div>
  );
}
